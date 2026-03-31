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
      const url = urls[i];

      try {
        const res = await fetch(url);

        if (!res.ok) {
          failed++;
          continue;
        }

        const buffer = Buffer.from(await res.arrayBuffer());

        const filename = `image_${i + 1}.jpg`;

        archive.append(buffer, { name: filename });
        success++;
      } catch {
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
        'Content-Disposition': 'attachment; filename=\"bulk-images.zip\"',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Bulk download failed' },
      { status: 500 }
    );
  }
}