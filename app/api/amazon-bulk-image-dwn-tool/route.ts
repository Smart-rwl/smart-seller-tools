// app/api/amazon-bulk-image-dwn-tool/route.ts
import { NextResponse } from 'next/server';
import archiver from 'archiver';

export const runtime = 'nodejs';
export const maxDuration = 60; // seconds; Vercel Pro respects this, Hobby caps at 10

// --- Tunables ---
const MAX_IMAGES_FREE = 100;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB per image
const CONCURRENCY = 8;

type ErrorRow = { asin: string; url: string; reason: string };
type Row = { asin: string; urls: string[] };
type Job = { asin: string; url: string; positionInAsin: number };
type FetchOk = { ok: true; buffer: Buffer; ext: string };
type FetchErr = { ok: false; error: ErrorRow };
type FetchResult = FetchOk | FetchErr;

// --- Helpers ---

function detectExt(url: string, contentType: string): string {
  const fromCt = contentType.split('/')[1]?.split(';')[0]?.toLowerCase();
  if (fromCt && ['jpeg', 'jpg', 'png', 'webp', 'gif'].includes(fromCt)) {
    return fromCt === 'jpeg' ? 'jpg' : fromCt;
  }
  const fromUrl = url
    .match(/\.(jpe?g|png|webp|gif)(?:\?|$)/i)?.[1]
    ?.toLowerCase();
  if (fromUrl) return fromUrl === 'jpeg' ? 'jpg' : fromUrl;
  return 'jpg';
}

function parseRows(rawData: string): Row[] {
  const rows: Row[] = [];
  for (const rawLine of rawData.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    // Strip surrounding quotes from CSV exports, normalize commas to whitespace
    const cleaned = line.replace(/["']/g, '').replace(/,/g, ' ').trim();

    // Skip header row (e.g. "ASIN,Image URL,...")
    if (/^asin\b/i.test(cleaned)) continue;

    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length < 2) continue;

    const asin = parts[0];
    // De-dupe URLs and only keep http(s) ones
    const seen = new Set<string>();
    const urls: string[] = [];
    for (const p of parts.slice(1)) {
      if (!/^https?:\/\//i.test(p)) continue;
      if (seen.has(p)) continue;
      seen.add(p);
      urls.push(p);
    }
    if (!asin || urls.length === 0) continue;
    rows.push({ asin, urls });
  }
  return rows;
}

async function fetchImage(job: Job): Promise<FetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(job.url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        Referer: 'https://www.amazon.in/',
      },
    });

    if (!res.ok) {
      return {
        ok: false,
        error: { asin: job.asin, url: job.url, reason: `HTTP ${res.status}` },
      };
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.toLowerCase().startsWith('image/')) {
      return {
        ok: false,
        error: {
          asin: job.asin,
          url: job.url,
          reason: `Not an image (${contentType || 'unknown'})`,
        },
      };
    }

    const arr = await res.arrayBuffer();
    if (arr.byteLength === 0) {
      return {
        ok: false,
        error: { asin: job.asin, url: job.url, reason: 'Empty body' },
      };
    }
    if (arr.byteLength > MAX_IMAGE_BYTES) {
      return {
        ok: false,
        error: {
          asin: job.asin,
          url: job.url,
          reason: `Too large (${(arr.byteLength / 1024 / 1024).toFixed(1)} MB)`,
        },
      };
    }

    return {
      ok: true,
      buffer: Buffer.from(arr),
      ext: detectExt(job.url, contentType),
    };
  } catch (e: unknown) {
    const err = e as { name?: string; message?: string };
    const reason =
      err?.name === 'AbortError'
        ? `Timeout (>${FETCH_TIMEOUT_MS / 1000}s)`
        : err?.message || 'Fetch error';
    return { ok: false, error: { asin: job.asin, url: job.url, reason } };
  } finally {
    clearTimeout(timer);
  }
}

// Bounded-concurrency map that preserves input order
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return results;
}

// --- Route ---

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { rawData?: unknown }
      | null;
    const rawData = body?.rawData;

    if (typeof rawData !== 'string' || !rawData.trim()) {
      return NextResponse.json(
        { error: 'No data provided' },
        { status: 400 }
      );
    }

    const rows = parseRows(rawData);
    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No valid rows found. Each line needs an ASIN followed by image URLs.' },
        { status: 400 }
      );
    }

    // Flatten into a job list, capped at free-tier limit
    const jobs: Job[] = [];
    outer: for (const row of rows) {
      for (let i = 0; i < row.urls.length; i++) {
        if (jobs.length >= MAX_IMAGES_FREE) break outer;
        jobs.push({
          asin: row.asin,
          url: row.urls[i],
          positionInAsin: i,
        });
      }
    }

    if (jobs.length === 0) {
      return NextResponse.json(
        { error: 'No valid image URLs found' },
        { status: 400 }
      );
    }

    // Fetch images concurrently
    const results = await mapWithConcurrency(jobs, CONCURRENCY, (job) =>
      fetchImage(job)
    );

    // Build ZIP in memory (reliable across Next.js runtimes)
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    const archiveDone = new Promise<void>((resolve, reject) => {
      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('warning', (err: NodeJS.ErrnoException) => {
        if (err.code !== 'ENOENT') reject(err);
      });
      archive.on('error', reject);
      archive.on('end', () => resolve());
    });

    const errors: ErrorRow[] = [];
    let successCount = 0;

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      const result = results[i];
      if (!result.ok) {
        errors.push(result.error);
        continue;
      }
      const filename =
        job.positionInAsin === 0
          ? `${job.asin}/${job.asin}.MAIN.${result.ext}`
          : `${job.asin}/${job.asin}.PT${String(job.positionInAsin).padStart(2, '0')}.${result.ext}`;
      archive.append(result.buffer, { name: filename });
      successCount++;
    }

    // If nothing succeeded, don't ship a useless archive — surface why
    if (successCount === 0) {
      archive.destroy();
      return NextResponse.json(
        {
          error: 'All image downloads failed',
          sample: errors.slice(0, 5),
        },
        { status: 502 }
      );
    }

    // Include the error report inside the ZIP so users see what got skipped
    if (errors.length) {
      const header = 'ASIN\tURL\tReason\n';
      const lines = errors.map((e) => `${e.asin}\t${e.url}\t${e.reason}`).join('\n');
      archive.append(header + lines, { name: 'error-report.txt' });
    }

    await archive.finalize();
    await archiveDone;

    const zipBuffer = Buffer.concat(chunks);

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="amazon-images.zip"',
        'Content-Length': String(zipBuffer.length),
        'X-Image-Count': String(successCount),
        'X-Error-Count': String(errors.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'ZIP generation failed';
    console.error('[bulk-image-download]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}