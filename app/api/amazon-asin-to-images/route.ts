// app/api/amazon-asin-to-images/route.ts
import { NextResponse } from 'next/server';
import JSZip from 'jszip';

export const runtime = 'nodejs';
export const maxDuration = 60; // seconds — bump on Vercel Pro if needed

/* ─────────────────────────────────────────────
   CONFIG
───────────────────────────────────────────── */
const MAX_ASINS_PER_REQUEST = 25;          // free-tier cap
const FETCH_CONCURRENCY     = 3;           // PDPs in flight
const IMAGE_CONCURRENCY     = 8;           // images in flight
const PDP_TIMEOUT_MS        = 15_000;
const IMG_TIMEOUT_MS        = 20_000;
const ASIN_REGEX            = /^[A-Z0-9]{10}$/;

const ALLOWED_TLDS = new Set([
  'com', 'ca', 'com.mx',
  'co.uk', 'de', 'fr', 'it', 'es', 'nl', 'se', 'pl',
  'in', 'co.jp', 'sg', 'com.au',
  'ae', 'sa', 'eg', 'com.tr', 'com.br',
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
  variant: string;          // 'MAIN' | 'PT01' | 'PT02' …
  ext: string;              // 'jpg' | 'png' | 'webp'
}

interface AsinResult {
  asin: string;
  images: ExtractedImage[];
  error?: string;
}

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

/** Build a hi-res Amazon image URL from an image ID. */
function buildImageUrl(id: string, ext = 'jpg', hiRes = true): string {
  // Amazon images live on m.media-amazon.com/images/I/{id}[._SLxxxx_].{ext}
  // To get max-res, we strip all size modifiers (anything between dots before the extension).
  const cleanId = hiRes ? id.replace(/\._[A-Z]{2}\d+_/g, '').replace(/\.[A-Z0-9_]+_/g, '') : id;
  return `https://m.media-amazon.com/images/I/${cleanId}.${ext}`;
}

/** Strip Amazon size suffix from a full image URL to get max-res. */
function toHiRes(url: string): string {
  // Match /I/{id}._SL1500_.jpg, /I/{id}._AC_SX466_.jpg, etc.
  return url.replace(
    /\/images\/I\/([^.]+)(\._[A-Z0-9,_]+_)+\.(jpg|jpeg|png|webp)/i,
    '/images/I/$1.$3',
  );
}

/** Sleep helper for jittered backoff. */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Fetch with timeout + abort. */
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/** Run an async mapper with a concurrency cap. */
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
   PDP SCRAPING
───────────────────────────────────────────── */

/**
 * Extract image IDs from Amazon PDP HTML. Amazon embeds gallery data in
 * inline scripts as `colorImages`, `imageGalleryData`, or `'imageBlockATF'`.
 * We try multiple patterns to be resilient to A/B tests and layout changes.
 */
function extractImagesFromHtml(html: string, hiRes: boolean, includeVariants: boolean): ExtractedImage[] {
  const found: ExtractedImage[] = [];
  const seen = new Set<string>();

  const pushUrl = (rawUrl: string, idx: number) => {
    if (!rawUrl || !rawUrl.includes('media-amazon.com/images/I/')) return;
    const url = hiRes ? toHiRes(rawUrl) : rawUrl;
    if (seen.has(url)) return;
    seen.add(url);
    const extMatch = url.match(/\.(jpg|jpeg|png|webp)(?:\?|$)/i);
    const ext = (extMatch?.[1] || 'jpg').toLowerCase();
    const variant = idx === 0 ? 'MAIN' : `PT${String(idx).padStart(2, '0')}`;
    found.push({ url, variant, ext });
  };

  // Strategy 1: colorImages.initial = [...]  (most common)
  // Captures `{ "hiRes": "...", "large": "...", "thumb": "..." }` blocks
  const colorImagesMatch = html.match(/['"]colorImages['"]\s*:\s*\{[^}]*['"]initial['"]\s*:\s*(\[[\s\S]*?\])\s*[,}]/);
  if (colorImagesMatch) {
    try {
      // Loose extraction — pick out hiRes/large URLs without strict JSON parse
      const block = colorImagesMatch[1];
      const urlRe = /['"](?:hiRes|large)['"]\s*:\s*['"](https?:\/\/[^'"]+)['"]/g;
      let m: RegExpExecArray | null;
      let idx = 0;
      while ((m = urlRe.exec(block)) !== null) {
        pushUrl(m[1], idx);
        // colorImages entries alternate hiRes/large — only count each entry once
        if (m[0].includes('hiRes')) idx++;
      }
    } catch { /* fall through */ }
  }

  // Strategy 2: imageGalleryData
  if (found.length === 0) {
    const galleryMatch = html.match(/['"]imageGalleryData['"]\s*:\s*(\[[\s\S]*?\])\s*[,}]/);
    if (galleryMatch) {
      const urlRe = /['"](?:mainUrl|hiRes|large)['"]\s*:\s*['"](https?:\/\/[^'"]+)['"]/g;
      let m: RegExpExecArray | null;
      let idx = 0;
      while ((m = urlRe.exec(galleryMatch[1])) !== null) {
        pushUrl(m[1], idx);
        idx++;
      }
    }
  }

  // Strategy 3: landingImage data-old-hires fallback (single main image)
  if (found.length === 0) {
    const mainMatch =
      html.match(/id=["']landingImage["'][^>]*data-old-hires=["']([^"']+)["']/i) ||
      html.match(/id=["']landingImage["'][^>]*data-a-dynamic-image=["']([^"']+)["']/i);
    if (mainMatch) {
      const raw = mainMatch[1].replace(/&quot;/g, '"').replace(/&#x27;/g, "'");
      const urlMatch = raw.match(/https?:\/\/[^"\s]+/);
      if (urlMatch) pushUrl(urlMatch[0], 0);
    }
  }

  if (!includeVariants && found.length > 0) {
    return [found[0]]; // MAIN only
  }

  return found;
}

/** Fetch a single PDP and extract images. Retries once on 503. */
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
        // Amazon throttling — back off and retry once
        attempt++;
        await sleep(800 + Math.random() * 1200);
        continue;
      }
      if (!res.ok) throw new Error(`PDP HTTP ${res.status}`);
      const html = await res.text();
      if (html.includes('captcha') && html.length < 20_000) {
        throw new Error('Blocked by Amazon CAPTCHA');
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

  /* ── Validate ── */
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

  /* ── Fetch all PDPs (throttled) ── */
  const results: AsinResult[] = await pool(cleanAsins, FETCH_CONCURRENCY, async (asin) => {
    try {
      let images = await fetchPdpImages(asin, marketplace, locale, hiRes, includeVariants);
      if (images.length > maxPerAsin) images = images.slice(0, maxPerAsin);
      return { asin, images };
    } catch (err) {
      return { asin, images: [], error: err instanceof Error ? err.message : 'Unknown error' };
    }
  });

  /* ── Build flat list of image downloads ── */
  type Task = { asin: string; img: ExtractedImage };
  const tasks: Task[] = [];
  for (const r of results) for (const img of r.images) tasks.push({ asin: r.asin, img });

  if (tasks.length === 0) {
    return NextResponse.json(
      { error: 'Could not extract images for any ASIN. They may be invalid, restricted, or blocked by Amazon.' },
      { status: 422 },
    );
  }

  /* ── Download images (throttled) ── */
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

  /* ── Note ASINs with no images at all ── */
  for (const r of results) {
    if (r.error) failures.push({ asin: r.asin, url: '', reason: r.error });
  }

  /* ── Manifest + error report ── */
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

  /* ── Generate ZIP ── */
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });

return new NextResponse(blob, {
  status: 200,
  headers: {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="amazon-${marketplace}-images.zip"`,
    'X-Image-Count': String(okCount),
    'X-Error-Count': String(failCount + (failures.length - failCount)),
    'X-Asin-Count': String(cleanAsins.length),
    'Cache-Control': 'no-store',
  },
});
}