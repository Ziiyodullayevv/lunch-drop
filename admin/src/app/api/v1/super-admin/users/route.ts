import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { getBackendUrl } from '../../../_utils/backend-url';

// ----------------------------------------------------------------------
// GET /api/v1/super-admin/users
//
// Proxies to the real backend. Returns [] with 200 while the backend
// endpoint is not yet implemented (404), so the frontend shows an
// empty table instead of an error toast.
// ----------------------------------------------------------------------

function buildHeaders(req: NextRequest) {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  const auth = req.headers.get('authorization');
  if (auth) headers.set('Authorization', auth);
  return headers;
}

export async function GET(req: NextRequest) {
  const backend = getBackendUrl(req, '/api/v1/super-admin/users');
  if (backend.error) return backend.error;

  try {
    const { url } = backend;
    req.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: buildHeaders(req),
      signal: AbortSignal.timeout(25_000),
    });

    if (res.status === 404) {
      return NextResponse.json([], { status: 200 });
    }

    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  const backend = getBackendUrl(req, '/api/v1/super-admin/users');
  if (backend.error) return backend.error;

  try {
    const { url } = backend;
    const body = await req.text();
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: buildHeaders(req),
      body,
      signal: AbortSignal.timeout(25_000),
    });
    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return NextResponse.json(
      { code: 'backend_unavailable', detail: "Backend bilan bog'lanib bo'lmadi" },
      { status: 502 }
    );
  }
}
