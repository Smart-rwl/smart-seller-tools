import { NextResponse } from 'next/server';
import archiver from 'archiver';
import { PassThrough } from 'stream';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { urls } = await req.json();

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const stream = new PassThrough();
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(stream);

    let success = 0;
    let failed = 0;

    for (let i = 0; i < urls.length; i++) {
      const originalUrl = urls[i];

      if (!originalUrl || !originalUrl.startsWith('http')) {
        failed++;
        continue;
      }

      // ✅ Clean URL (remove query params like ?format=avif)
      const cleanUrl = originalUrl.split('?')[0];

      try {
        console.log('Trying:', cleanUrl);

        const res = await fetch(cleanUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
            'Accept':
              'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': new URL(cleanUrl).origin,
            'Connection': 'keep-alive',
          },
        });

        if (!res.ok) {
          console.log('FAILED:', res.status, cleanUrl);
          failed++;
          continue;
        }

        const buffer = Buffer.from(await res.arrayBuffer());

        // ✅ Detect extension from content-type
        let extension = '.jpg';
        const contentType = res.headers.get('content-type') || '';

        if (contentType.includes('png')) extension = '.png';
        else if (contentType.includes('webp')) extension = '.webp';
        else if (contentType.includes('avif')) extension = '.avif';
        else if (contentType.includes('jpeg')) extension = '.jpg';

        const filename = `image_${i + 1}${extension}`;

        archive.append(buffer, { name: filename });

        console.log('Added:', filename);

        success++;
      } catch (error) {
        console.log('EXCEPTION:', cleanUrl);
        failed++;
      }
    }

    archive.append(
      `Downloaded: ${success}\nFailed: ${failed}`,
      { name: 'summary.txt' }
    );

    await archive.finalize();

    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="bulk-images.zip"',
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Bulk download failed' },
      { status: 500 }
    );
  }
}