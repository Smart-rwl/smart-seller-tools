import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// 🔒 Free tier limit (change later for Pro)
const MAX_IMAGES_FREE = 100;

export async function POST(req: Request) {
  try {
    const { rawData } = await req.json();

    const zip = new JSZip();
    const errors: { asin: string; url: string; reason: string }[] = [];

    const lines = rawData.trim().split('\n');

    let totalImages = 0;

    for (const line of lines) {
  if (!line.trim()) continue;

  // ✅ Skip CSV header row
  if (line.toLowerCase().startsWith('asin')) continue;

  // ✅ Normalize CSV / TSV / pasted text
  const cleanLine = line.replace(/,/g, ' ').trim();

  const parts = cleanLine.split(/\s+/);
  const asin = parts[0];
  const urls = parts.slice(1);

  if (!asin || urls.length === 0) continue;

  const folder = zip.folder(asin);
  if (!folder) continue;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    if (!url.startsWith('http')) continue;

    try {
      const res = await fetch(url, {
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    'Referer': 'https://www.amazon.in/',
  },
});

      if (!res.ok) continue;

      const buffer = await res.arrayBuffer();

      const filename =
        i === 0
          ? `${asin}.MAIN.jpg`
          : `${asin}.PT${String(i).padStart(2, '0')}.jpg`;

      folder.file(filename, new Uint8Array(buffer));
    } catch {
      continue;
    }
  }
}

    // 📄 Add error report (if any)
    if (errors.length) {
      const errorText = errors
        .map(e => `${e.asin}\t${e.url}\t${e.reason}`)
        .join('\n');

      zip.file('error-report.txt', errorText);
    }

    const zipData = await zip.generateAsync({
  type: 'uint8array',
  compression: 'DEFLATE',
});

return new NextResponse(Buffer.from(zipData), {

  headers: {
    'Content-Type': 'application/zip',
    'Content-Disposition': 'attachment; filename="amazon-images.zip"',
  },
});
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'ZIP generation failed' },
      { status: 500 }
    );
  }
}
