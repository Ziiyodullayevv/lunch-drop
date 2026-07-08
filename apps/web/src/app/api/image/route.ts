import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { getBackendUrl } from '../_utils/backend-url';

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path');

  if (!path?.startsWith('/') || path.startsWith('//')) {
    return NextResponse.json({ detail: 'Invalid image path' }, { status: 400 });
  }

  const backend = getBackendUrl(req, path);
  if (backend.error) return backend.error;

  const { url } = backend;

  let res: Response;

  try {
    res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(25_000) });
  } catch {
    return NextResponse.json(
      { code: 'backend_unavailable', detail: "Rasm serveri bilan bog'lanib bo'lmadi" },
      { status: 502 }
    );
  }

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
