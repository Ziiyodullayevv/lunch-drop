import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

// ----------------------------------------------------------------------
// GET /api/v1/super-admin/users
//
// Proxies to the real backend. Returns [] with 200 while the backend
// endpoint is not yet implemented (404), so the frontend shows an
// empty table instead of an error toast.
// ----------------------------------------------------------------------

const BACKEND = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://164.90.210.222:8000';

function buildHeaders(req: NextRequest) {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  const auth = req.headers.get('authorization');
  if (auth) headers.set('Authorization', auth);
  return headers;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL('/api/v1/super-admin/users', BACKEND);
    req.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));

    const res = await fetch(url.toString(), { method: 'GET', headers: buildHeaders(req) });

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
  try {
    const url = new URL('/api/v1/super-admin/users', BACKEND);
    const body = await req.text();
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: buildHeaders(req),
      body,
    });
    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}
