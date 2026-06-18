import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://164.90.210.222:8000';

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path');

  if (!path?.startsWith('/') || path.startsWith('//')) {
    return NextResponse.json({ detail: 'Invalid image path' }, { status: 400 });
  }

  const url = new URL(path, BACKEND);
  const backendUrl = new URL(BACKEND);

  if (url.origin !== backendUrl.origin) {
    return NextResponse.json({ detail: 'Invalid image origin' }, { status: 400 });
  }

  const res = await fetch(url, { cache: 'no-store' });

  if (!res.ok) {
    return NextResponse.json({ detail: 'Image not found' }, { status: res.status });
  }

  return new NextResponse(res.body, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('content-type') ?? 'application/octet-stream',
      'Cache-Control': res.headers.get('cache-control') ?? 'public, max-age=3600',
    },
  });
}
