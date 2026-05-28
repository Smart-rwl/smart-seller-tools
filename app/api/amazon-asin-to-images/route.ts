// app/api/amazon-asin-to-images/route.ts
import { NextResponse } from 'next/server';
import JSZip from 'jszip';

export const runtime = 'nodejs';
export const maxDuration = 60;

/* ─────────────────────────────────────────────
   CONFIG
───────────────────────────────────────────── */
const MAX_ASINS_PER_REQUEST = 25;
const FETCH_CONCURRENCY     = 3;
const IMAGE_CONCURRENCY     = 8;
const PDP_TIMEOUT_MS        = 15_000;
const IMG_TIMEOUT_MS        = 20_000;
const ASIN_REGEX            = /^[A-Z0-9]{10}$/;

const ALLOWED_TLDS = new Set([
  'com', 'ca', 'com.mx', 'com.br',
  'co.uk', 'de', 'fr', 'it', 'es', 'nl', 'se', 'pl',
  'in', 'co.jp', 'sg', 'com.au',
  'ae', 'sa', 'eg', 'com.tr',
]);

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
];

const randomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
interface RequestBody {
  asins: string[];
  marketplace: string;
  locale?: string;
  options?: {
    includeVariants?: boolean;
    hiRes?: boolean;
    maxPerAsin?: number;
  };
}

interface ExtractedImage {
  url: string;
  variant: string;
  ext: string;
}

interface AsinResult {
  asin: string;
  images: ExtractedImage[];
  error?: string;
}

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

/**
 * Strip ALL Amazon size/crop modifiers from a CDN URL to get the original.
 * Captures everything between the image ID and the file extension and removes it.
 * Handles arbitrary modifier complexity: ._SL1500_, ._AC_SX466_SR300,300_, etc.
 */
function toHiRes(url: string): string {
  return url.replace(
    /(\/images\/I\/[A-Za-z0-9+\-_%]+)\.[^/]*?\.(jpg|jpeg|png|webp)(\?|$)/i,
    '$1.$2$3',
  );
}

/** Extract the Amazon image ID from a CDN URL (used for deduping). */
function idFromUrl(url: string): string | null {
  const m = url.match(/\/images\/I\/([A-Za-z0-9+\-_%]+?)(?:[._]|\?|$)/);
  return m ? m[1] : null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function pool<T, R>(items: T[], limit: number, mapper: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await mapper(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

/* ─────────────────────────────────────────────
   PDP IMAGE EXTRACTION
───────────────────────────────────────────── */

/**
 * Extract product images from PDP HTML.
 *
 * Strategy (in order, until we have results):
 *   1. Global scan for `"hiRes":"url"` and `"large":"url"` in document order.
 *      Dedupe by image ID. This catches all gallery entries cleanly even when
 *      the colorImages JSON has nested arrays that broke bracket-matching before.
 *   2. landingImage data-old-hires (single main image fallback)
 *   3. landingImage data-a-dynamic-image (JSON of sizes — pick largest)
 *   4. altImages thumbnail list (low-res URLs, stripped to hi-res)
 */
function extractImagesFromHtml(html: string, hiRes: boolean, includeVariants: boolean): ExtractedImage[] {
  const found: ExtractedImage[] = [];
  const seenIds = new Set<string>();

  const pushUrl = (rawUrl: string) => {
    if (!rawUrl) return;
    // Unescape JSON-style escapes that occasionally appear inline
    const unescaped = rawUrl
      .replace(/\\\//g, '/')
      .replace(/\\u002F/gi, '/')
      .replace(/&amp;/g, '&');
    if (!unescaped.includes('media-amazon.com/images/I/') &&
        !unescaped.includes('ssl-images-amazon.com/images/I/')) return;
    const id = idFromUrl(unescaped);
    if (!id) return;
    if (seenIds.has(id)) return;
    seenIds.add(id);
    const cleaned = hiRes ? toHiRes(unescaped) : unescaped;
    const extMatch = cleaned.match(/\.(jpg|jpeg|png|webp)(?:\?|$)/i);
    const ext = (extMatch?.[1] || 'jpg').toLowerCase();
    const variant = found.length === 0 ? 'MAIN' : `PT${String(found.length).padStart(2, '0')}`;
    found.push({ url: cleaned, variant, ext });
  };

  // Strategy 1: global scan for hiRes/large URLs (preserves document order)
  const galleryRe = /["'](?:hiRes|large)["']\s*:\s*["'](https?:[^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = galleryRe.exec(html)) !== null) pushUrl(m[1]);

  // Strategy 2: landingImage data-old-hires fallback
  if (found.length === 0) {
    const main = html.match(/id=["']landingImage["'][^>]*data-old-hires=["']([^"']+)["']/i);
    if (main) pushUrl(main[1]);
  }

  // Strategy 3: data-a-dynamic-image JSON attribute → pick largest size
  if (found.length === 0) {
    const dyn = html.match(/id=["']landingImage["'][^>]*data-a-dynamic-image=["']([^"']+)["']/i);
    if (dyn) {
      const raw = dyn[1].replace(/&quot;/g, '"').replace(/&#x27;/g, "'");
      const urls = Array.from(raw.matchAll(/https?:\/\/[^"\s,\]]+/g)).map((x) => x[0]);
      // Pick largest by _SLxxxx_ size annotation if present
      const sized = urls
        .map((u) => {
          const sz = u.match(/_SL(\d+)_|_SX(\d+)_|_SY(\d+)_/);
          const n = sz ? parseInt(sz[1] || sz[2] || sz[3] || '0', 10) : 0;
          return { url: u, size: n };
        })
        .sort((a, b) => b.size - a.size);
      if (sized.length > 0) pushUrl(sized[0].url);
    }
  }

  // Strategy 4: altImages thumbnail list (last resort — strip size suffix on each)
  if (found.length < 2 && includeVariants) {
    const altSection = html.match(/id=["']altImages["'][\s\S]*?<\/ul>/i);
    if (altSection) {
      const imgUrls = Array.from(altSection[0].matchAll(
        /src=["'](https?:\/\/[^"']*(?:media-amazon|ssl-images-amazon)\.com\/images\/I\/[^"']+)["']/gi,
      ));
      for (const im of imgUrls) pushUrl(im[1]);
    }
  }

  if (!includeVariants && found.length > 0) {
    return [found[0]];
  }

  return found;
}

/** Fetch a single PDP and extract images. Retries once on 503/429. */
async function fetchPdpImages(
  asin: string,
  tld: string,
  locale: string | undefined,
  hiRes: boolean,
  includeVariants: boolean,
): Promise<ExtractedImage[]> {
  const url = `https://www.amazon.${tld}/dp/${asin}?th=1&psc=1`;

  const headers: Record<string, string> = {
    'User-Agent': randomUA(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': locale ? `${locale},${locale.split('-')[0]};q=0.9,en;q=0.8` : 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
  };

  let attempt = 0;
  let lastErr: Error | null = null;
  while (attempt < 2) {
    try {
      const res = await fetchWithTimeout(url, { headers, redirect: 'follow' }, PDP_TIMEOUT_MS);
      if (res.status === 404) throw new Error('ASIN not found (404)');
      if (res.status === 503 || res.status === 429) {
        attempt++;
        await sleep(800 + Math.random() * 1200);
        continue;
      }
      if (!res.ok) throw new Error(`PDP HTTP ${res.status}`);
      const html = await res.text();
      if (html.toLowerCase().includes('api-services-support@amazon.com') && html.length < 30_000) {
        throw new Error('Blocked by Amazon CAPTCHA / robot check');
      }
      const images = extractImagesFromHtml(html, hiRes, includeVariants);
      if (images.length === 0) throw new Error('No images found in PDP');
      return images;
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      attempt++;
      if (attempt < 2) await sleep(500 + Math.random() * 800);
    }
  }
  throw lastErr || new Error('PDP fetch failed');
}

/* ─────────────────────────────────────────────
   IMAGE DOWNLOAD
───────────────────────────────────────────── */
async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const res = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': randomUA(),
        'Accept': 'image/avif,image/webp,image/jpeg,image/png,*/*',
        'Referer': 'https://www.amazon.com/',
      },
    }, IMG_TIMEOUT_MS);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    if (ab.byteLength === 0) return null;
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

/* ─────────────────────────────────────────────
   ROUTE HANDLER
───────────────────────────────────────────── */
export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { asins, marketplace, locale, options } = body;
  const includeVariants = options?.includeVariants ?? true;
  const hiRes           = options?.hiRes ?? true;
  const maxPerAsin      = Math.max(1, Math.min(20, options?.maxPerAsin ?? 20));

  if (!Array.isArray(asins) || asins.length === 0) {
    return NextResponse.json({ error: 'Provide at least one ASIN' }, { status: 400 });
  }
  if (!marketplace || typeof marketplace !== 'string' || !ALLOWED_TLDS.has(marketplace)) {
    return NextResponse.json({ error: `Unsupported marketplace: ${marketplace}` }, { status: 400 });
  }
  if (asins.length > MAX_ASINS_PER_REQUEST) {
    return NextResponse.json(
      { error: `Too many ASINs. Free tier limit is ${MAX_ASINS_PER_REQUEST} per run.` },
      { status: 400 },
    );
  }

  const cleanAsins = Array.from(new Set(
    asins.map((a) => String(a).trim().toUpperCase()).filter((a) => ASIN_REGEX.test(a)),
  ));
  if (cleanAsins.length === 0) {
    return NextResponse.json({ error: 'No valid ASINs in request' }, { status: 400 });
  }

  const results: AsinResult[] = await pool(cleanAsins, FETCH_CONCURRENCY, async (asin) => {
    try {
      let images = await fetchPdpImages(asin, marketplace, locale, hiRes, includeVariants);
      if (images.length > maxPerAsin) images = images.slice(0, maxPerAsin);
      return { asin, images };
    } catch (err) {
      return { asin, images: [], error: err instanceof Error ? err.message : 'Unknown error' };
    }
  });

  type Task = { asin: string; img: ExtractedImage };
  const tasks: Task[] = [];
  for (const r of results) for (const img of r.images) tasks.push({ asin: r.asin, img });

  if (tasks.length === 0) {
    return NextResponse.json(
      { error: 'Could not extract images for any ASIN. They may be invalid, restricted, or blocked by Amazon.' },
      { status: 422 },
    );
  }

  const zip = new JSZip();
  let okCount = 0;
  let failCount = 0;
  const failures: { asin: string; url: string; reason: string }[] = [];
  const manifest: Record<string, { variant: string; filename: string; url: string }[]> = {};

  await pool(tasks, IMAGE_CONCURRENCY, async ({ asin, img }) => {
    const buf = await downloadImage(img.url);
    const filename = `${asin}.${img.variant}.${img.ext === 'jpeg' ? 'jpg' : img.ext}`;
    if (!buf) {
      failCount++;
      failures.push({ asin, url: img.url, reason: 'download failed' });
      return;
    }
    zip.folder(asin)!.file(filename, buf);
    okCount++;
    if (!manifest[asin]) manifest[asin] = [];
    manifest[asin].push({ variant: img.variant, filename, url: img.url });
  });

  for (const r of results) {
    if (r.error) failures.push({ asin: r.asin, url: '', reason: r.error });
  }

  zip.file('manifest.json', JSON.stringify({
    generatedAt: new Date().toISOString(),
    marketplace: `amazon.${marketplace}`,
    locale: locale || null,
    options: { includeVariants, hiRes, maxPerAsin },
    asins: manifest,
  }, null, 2));

  if (failures.length > 0) {
    const txt = [
      'Amazon ASIN to Images — Error Report',
      `Generated: ${new Date().toISOString()}`,
      `Marketplace: amazon.${marketplace}`,
      '',
      ...failures.map((f) => `[${f.asin}] ${f.reason}${f.url ? '  ' + f.url : ''}`),
    ].join('\n');
    zip.file('error-report.txt', txt);
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return new NextResponse(blob, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="amazon-${marketplace}-images.zip"`,
      'X-Image-Count': String(okCount),
      'X-Error-Count': String(failures.length),
      'X-Asin-Count': String(cleanAsins.length),
      'Cache-Control': 'no-store',
    },
  });
}