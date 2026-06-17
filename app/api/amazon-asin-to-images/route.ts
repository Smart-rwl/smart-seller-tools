// app/api/amazon-asin-to-images/route.ts
import { NextResponse } from 'next/server';
import JSZip from 'jszip';

export const runtime = 'nodejs';
export const maxDuration = 60;

/* ─────────────────────────────────────────────
   CONFIG
───────────────────────────────────────────── */
const MAX_ASINS_PER_REQUEST = 25;
const IMAGE_CONCURRENCY     = 8;
const PDP_TIMEOUT_MS        = 15_000;
const IMG_TIMEOUT_MS        = 20_000;
const MAX_PDP_RETRIES       = 3;          // was implicit 2
const ASIN_REGEX            = /^[A-Z0-9]{10}$/;

const ALLOWED_TLDS = new Set([
  'com', 'ca', 'com.mx', 'com.br',
  'co.uk', 'de', 'fr', 'it', 'es', 'nl', 'se', 'pl',
  'in', 'co.jp', 'sg', 'com.au',
  'ae', 'sa', 'eg', 'com.tr',
]);

/** Markets with aggressive bot detection — single-thread + delay. */
const SENSITIVE_MARKETS = new Set(['in', 'ae', 'sa', 'eg', 'com.tr']);

const FETCH_CONCURRENCY = (tld: string) => SENSITIVE_MARKETS.has(tld) ? 1 : 3;
const INTER_REQUEST_DELAY_MS = (tld: string) => SENSITIVE_MARKETS.has(tld) ? 450 : 0;

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

function toHiRes(url: string): string {
  return url.replace(
    /(\/images\/I\/[A-Za-z0-9+\-_%]+)\.[^/]*?\.(jpg|jpeg|png|webp)(\?|$)/i,
    '$1.$2$3',
  );
}

function idFromUrl(url: string): string | null {
  const m = url.match(/\/images\/I\/([A-Za-z0-9+\-_%]+?)(?:[._]|\?|$)/);
  return m ? m[1] : null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Build a clean Accept-Language header without duplicate-language entries.
 * Fixes the edge case where locale primary equals locale ('ja' === 'ja-JP'.split('-')[0]).
 */
function buildAcceptLanguage(locale?: string): string {
  if (!locale) return 'en-US,en;q=0.9';
  const primary = locale.split('-')[0];
  if (locale === primary) return `${primary},en;q=0.8`;
  if (primary === 'en') return `${locale},en;q=0.9`;
  return `${locale},${primary};q=0.9,en;q=0.8`;
}

/**
 * Comprehensive Amazon block-page detection. Returns the specific reason
 * so users can distinguish CAPTCHA from "Sorry" from generic blocks.
 */
function detectBlockPage(html: string): string | null {
  // 1. CAPTCHA endpoint reference
  if (html.includes('/errors/validateCaptcha')) {
    return 'Amazon CAPTCHA challenge';
  }
  // 2. "Type the characters" — classic robot check copy
  if (/type the characters you see/i.test(html)) {
    return 'Amazon robot check (CAPTCHA)';
  }
  // 3. Generic anti-bot interstitial
  if (/we\s+just\s+need\s+to\s+make\s+sure\s+you'?re?\s+not\s+a\s+robot/i.test(html)) {
    return 'Amazon anti-bot interstitial';
  }
  // 4. <title>Robot Check</title>
  if (/<title>\s*Robot Check\s*<\/title>/i.test(html)) {
    return 'Amazon Robot Check page';
  }
  // 5. "Sorry!" pages
  if (/<title>\s*Sorry!?\s*[\s\S]{0,80}(went wrong|servers)/i.test(html)) {
    return 'Amazon Sorry page';
  }
  // 6. Existing heuristic — small support page
  if (html.length < 30_000 && /api-services-support@amazon\.com/i.test(html)) {
    return 'Amazon support error page (likely blocked)';
  }
  // 7. Page is suspiciously small AND doesn't contain expected PDP markers
  if (html.length < 20_000 && !/(landingImage|imageGalleryData|colorImages|"hiRes")/.test(html)) {
    return `Suspiciously small response (${html.length}B) with no PDP markers`;
  }
  return null;
}

/**
 * Wrap a URL through a configured proxy (ScrapingBee-style) if env var is set.
 * Different providers have different URL schemes — this assumes a query-param wrapper.
 * Examples that work:
 *   ScrapingBee: https://app.scrapingbee.com/api/v1/?api_key=KEY&url={URL_ENCODED}
 *   ScraperAPI: http://api.scraperapi.com?api_key=KEY&url={URL_ENCODED}
 *
 * Set AMAZON_SCRAPER_PROXY to the prefix up to and including `url=`:
 *   AMAZON_SCRAPER_PROXY="https://app.scrapingbee.com/api/v1/?api_key=YOUR_KEY&render_js=false&url="
 */
function proxiedUrl(target: string): string {
  const prefix = process.env.AMAZON_SCRAPER_PROXY;
  if (!prefix) return target;
  return `${prefix}${encodeURIComponent(target)}`;
}

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
   PDP IMAGE EXTRACTION  (unchanged — this part works well)
───────────────────────────────────────────── */

function bracketMatchArray(text: string, openBracketIdx: number): string | null {
  if (text[openBracketIdx] !== '[') return null;
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let escape = false;
  for (let i = openBracketIdx; i < text.length; i++) {
    const c = text[i];
    if (escape) { escape = false; continue; }
    if (inString) {
      if (c === '\\') { escape = true; continue; }
      if (c === stringChar) { inString = false; }
      continue;
    }
    if (c === '"' || c === "'") { inString = true; stringChar = c; continue; }
    if (c === '[') { depth++; continue; }
    if (c === ']') {
      depth--;
      if (depth === 0) return text.substring(openBracketIdx, i + 1);
    }
  }
  return null;
}

function findColorImagesInitial(html: string): string | null {
  const colorMatch = html.match(/['"]colorImages['"]\s*:/);
  if (!colorMatch || colorMatch.index === undefined) return null;
  const initialRe = /['"]initial['"]\s*:\s*\[/g;
  initialRe.lastIndex = colorMatch.index;
  const initialMatch = initialRe.exec(html);
  if (!initialMatch) return null;
  const bracketIdx = initialMatch.index + initialMatch[0].length - 1;
  return bracketMatchArray(html, bracketIdx);
}

function findImageGalleryData(html: string): string | null {
  const m = html.match(/['"]imageGalleryData['"]\s*:\s*\[/);
  if (!m || m.index === undefined) return null;
  const bracketIdx = m.index + m[0].length - 1;
  return bracketMatchArray(html, bracketIdx);
}

function splitArrayEntries(arrayText: string): string[] {
  const entries: string[] = [];
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let escape = false;
  let entryStart = -1;

  for (let i = 0; i < arrayText.length; i++) {
    const c = arrayText[i];
    if (escape) { escape = false; continue; }
    if (inString) {
      if (c === '\\') { escape = true; continue; }
      if (c === stringChar) { inString = false; }
      continue;
    }
    if (c === '"' || c === "'") { inString = true; stringChar = c; continue; }
    if (c === '{') {
      if (depth === 0) entryStart = i;
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0 && entryStart >= 0) {
        entries.push(arrayText.substring(entryStart, i + 1));
        entryStart = -1;
      }
    }
  }
  return entries;
}

function pickOneUrlPerEntry(arrayText: string, preferredFields: string[]): string[] {
  const urls: string[] = [];
  for (const entry of splitArrayEntries(arrayText)) {
    for (const field of preferredFields) {
      const re = new RegExp(`["']${field}["']\\s*:\\s*["'](https?:[^"']+)["']`);
      const m = entry.match(re);
      if (m) { urls.push(m[1]); break; }
    }
  }
  return urls;
}

function extractImagesFromHtml(html: string, hiRes: boolean, includeVariants: boolean): ExtractedImage[] {
  const found: ExtractedImage[] = [];
  const seenIds = new Set<string>();

  const pushUrl = (rawUrl: string) => {
    if (!rawUrl) return;
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

  const initialArr = findColorImagesInitial(html);
  if (initialArr) {
    for (const url of pickOneUrlPerEntry(initialArr, ['hiRes', 'large'])) pushUrl(url);
  }

  if (found.length === 0) {
    const galleryArr = findImageGalleryData(html);
    if (galleryArr) {
      for (const url of pickOneUrlPerEntry(galleryArr, ['mainUrl', 'hiRes', 'large'])) pushUrl(url);
    }
  }

  if (found.length === 0) {
    const main = html.match(/id=["']landingImage["'][^>]*data-old-hires=["']([^"']+)["']/i);
    if (main) pushUrl(main[1]);
  }

  if (found.length === 0) {
    const dyn = html.match(/id=["']landingImage["'][^>]*data-a-dynamic-image=["']([^"']+)["']/i);
    if (dyn) {
      const raw = dyn[1].replace(/&quot;/g, '"').replace(/&#x27;/g, "'");
      const urls = Array.from(raw.matchAll(/https?:\/\/[^"\s,\]]+/g)).map((x) => x[0]);
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

  if (found.length < 2 && includeVariants) {
    const altSection = html.match(/id=["']altImages["'][\s\S]*?<\/ul>/i);
    if (altSection) {
      const imgUrls = Array.from(altSection[0].matchAll(
        /src=["'](https?:\/\/[^"']*(?:media-amazon|ssl-images-amazon)\.com\/images\/I\/[^"']+)["']/gi,
      ));
      for (const im of imgUrls) pushUrl(im[1]);
    }
  }

  if (!includeVariants && found.length > 0) return [found[0]];
  return found;
}

/* ─────────────────────────────────────────────
   FETCH PDP
───────────────────────────────────────────── */

async function fetchPdpImages(
  asin: string,
  tld: string,
  locale: string | undefined,
  hiRes: boolean,
  includeVariants: boolean,
): Promise<ExtractedImage[]> {
  // Inter-request delay for sensitive markets (sequential pool means this staggers naturally)
  const delay = INTER_REQUEST_DELAY_MS(tld);
  if (delay > 0) await sleep(delay + Math.random() * 200);

  const url = `https://www.amazon.${tld}/dp/${asin}?th=1&psc=1`;
  const headers: Record<string, string> = {
    'User-Agent': randomUA(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': buildAcceptLanguage(locale),
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

  while (attempt < MAX_PDP_RETRIES) {
    try {
      const res = await fetchWithTimeout(
        proxiedUrl(url),
        { headers, redirect: 'follow' },
        PDP_TIMEOUT_MS,
      );

      if (res.status === 404) throw new Error('ASIN not found (404)');
      if (res.status === 503 || res.status === 429) {
        attempt++;
        // Longer exponential-ish backoff: 1s, 2s, 3.5s
        await sleep((1000 * attempt) + Math.random() * 800);
        continue;
      }
      if (res.status === 403) throw new Error('Amazon blocked the request (403 Forbidden)');
      if (!res.ok) throw new Error(`PDP HTTP ${res.status}`);

      const html = await res.text();

      // Comprehensive block-page detection
      const blockReason = detectBlockPage(html);
      if (blockReason) {
        // Retry on block — Amazon sometimes serves a CAPTCHA once then real content
        if (attempt < MAX_PDP_RETRIES - 1) {
          attempt++;
          await sleep((1500 * attempt) + Math.random() * 1000);
          continue;
        }
        throw new Error(blockReason);
      }

      const images = extractImagesFromHtml(html, hiRes, includeVariants);
      if (images.length === 0) {
        throw new Error(`No images found in PDP (${html.length}B response)`);
      }
      return images;
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      // Don't retry on 404 — it won't recover
      if (lastErr.message.includes('404')) break;
      attempt++;
      if (attempt < MAX_PDP_RETRIES) await sleep(600 + Math.random() * 900);
    }
  }
  throw lastErr || new Error('PDP fetch failed');
}

/* ─────────────────────────────────────────────
   IMAGE DOWNLOAD
───────────────────────────────────────────── */

async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const res = await fetchWithTimeout(
      proxiedUrl(url),
      {
        headers: {
          'User-Agent': randomUA(),
          'Accept': 'image/avif,image/webp,image/jpeg,image/png,*/*',
          'Referer': 'https://www.amazon.com/',
        },
      },
      IMG_TIMEOUT_MS,
    );
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    if (ab.byteLength === 0) return null;
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

/* ─────────────────────────────────────────────
   DIAGNOSTIC HINT
───────────────────────────────────────────── */

function diagnosticHint(failures: { asin: string; reason: string }[], marketplace: string): string {
  if (failures.length === 0) return '';
  const reasons = failures.map((f) => f.reason.toLowerCase());

  const blockedCount = reasons.filter((r) =>
    r.includes('captcha') || r.includes('robot') || r.includes('blocked') ||
    r.includes('anti-bot') || r.includes('sorry page') || r.includes('support error') ||
    r.includes('suspiciously small')
  ).length;

  const rateLimitCount = reasons.filter((r) => r.includes('503') || r.includes('429')).length;
  const notFoundCount  = reasons.filter((r) => r.includes('404')).length;
  const noImagesCount  = reasons.filter((r) => r.includes('no images found')).length;
  const total = failures.length;

  if (blockedCount === total) {
    const hasProxy = !!process.env.AMAZON_SCRAPER_PROXY;
    if (hasProxy) {
      return `Amazon.${marketplace} blocked all ${total} requests even through the configured proxy. The proxy may need a different setting (try render_js=true for ScrapingBee), a different residential pool, or the proxy quota is exhausted.`;
    }
    return `Amazon.${marketplace} is blocking the server's IP — all ${total} requests hit anti-bot pages. This is expected on Vercel/serverless for amazon.in and Middle East markets. Fix: set the AMAZON_SCRAPER_PROXY env var to a residential proxy (ScrapingBee, ScraperAPI, Bright Data) using the format documented in proxiedUrl() in route.ts.`;
  }

  if (rateLimitCount > total * 0.5) {
    return `Amazon rate-limited ${rateLimitCount}/${total} requests (503/429). Wait 5-10 minutes and retry with a smaller batch (≤3 ASINs), or set AMAZON_SCRAPER_PROXY.`;
  }

  if (notFoundCount === total) {
    return `All ${total} ASINs returned 404 — verify the ASINs exist in amazon.${marketplace}. Some ASINs are marketplace-specific.`;
  }

  if (noImagesCount > total * 0.5) {
    return `PDP loaded but image extraction failed for ${noImagesCount}/${total} ASINs. Amazon may have changed their HTML structure for this category. Check the response size in the error message — if it's normal (>100KB), the extraction logic needs an update.`;
  }

  return `Mixed failures across ${total} ASINs. See per-ASIN details. Common causes: rate limiting (try smaller batches), invalid ASINs (verify in amazon.${marketplace}), or partial bot detection.`;
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

  const concurrency = FETCH_CONCURRENCY(marketplace);

  const results: AsinResult[] = await pool(cleanAsins, concurrency, async (asin) => {
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

  /* ────── ALL FAILED — return rich diagnostic ────── */
  if (tasks.length === 0) {
    const failedAsins = results.map((r) => ({
      asin: r.asin,
      reason: r.error || 'Unknown failure',
    }));

    // Group identical reasons for compact summary line
    const reasonCounts = new Map<string, number>();
    for (const f of failedAsins) {
      reasonCounts.set(f.reason, (reasonCounts.get(f.reason) || 0) + 1);
    }
    const summary = Array.from(reasonCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([reason, count]) => `${count}× ${reason}`)
      .join(' · ');

    const hint = diagnosticHint(failedAsins, marketplace);

    return new NextResponse(
      JSON.stringify({
        error: `All ${cleanAsins.length} ASINs failed on amazon.${marketplace}. ${summary}`,
        marketplace: `amazon.${marketplace}`,
        concurrency,
        proxyConfigured: !!process.env.AMAZON_SCRAPER_PROXY,
        diagnostic: hint,
        details: failedAsins,
      }, null, 2),
      {
        status: 422,
        headers: {
          'Content-Type': 'application/json',
          'X-Image-Count':  '0',
          'X-Error-Count':  String(failedAsins.length),
          'X-Asin-Count':   String(cleanAsins.length),
          'Cache-Control':  'no-store',
        },
      },
    );
  }

  /* ────── PARTIAL OR FULL SUCCESS — build ZIP ────── */
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
      failures.push({ asin, url: img.url, reason: 'image download failed' });
      return;
    }
    zip.folder(asin)!.file(filename, buf);
    okCount++;
    if (!manifest[asin]) manifest[asin] = [];
    manifest[asin].push({ variant: img.variant, filename, url: img.url });
  });

  // PDP-level failures join image-download failures in the report
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
      `Concurrency used: ${concurrency}`,
      `Proxy configured: ${!!process.env.AMAZON_SCRAPER_PROXY}`,
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
      'X-Image-Count':  String(okCount),
      'X-Error-Count':  String(failures.length),
      'X-Asin-Count':   String(cleanAsins.length),
      'Cache-Control':  'no-store',
    },
  });
}