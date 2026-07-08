import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { getBackendUrl } from './backend-url';

export async function proxyBackendRequest(req: NextRequest, pathname: string) {
  const backend = getBackendUrl(req, pathname);
  if (backend.error) return backend.error;

  const { url } = backend;
  req.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));

  const headers = new Headers();
  const contentType = req.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);
  const auth = req.headers.get('authorization');
  if (auth) headers.set('Authorization', auth);

  const body = req.method !== 'GET' && req.method !== 'HEAD'
    ? await req.arrayBuffer()
    : undefined;

  try {
    const res = await fetch(url.toString(), {
      method: req.method,
      headers,
      body,
      signal: AbortSignal.timeout(25_000),
    });

    const data = await res.text();

    return new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
    });
  } catch {
    return NextResponse.json(
      { code: 'backend_unavailable', detail: "Backend bilan bog'lanib bo'lmadi" },
      { status: 502 }
    );
  }
}
