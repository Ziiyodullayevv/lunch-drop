import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

// ----------------------------------------------------------------------

const BACKEND = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://164.90.210.222:8000';

async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathname = `/api/v1/${path.join('/')}`;

  const url = new URL(pathname, BACKEND);
  req.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));

  const headers = new Headers();
  const contentType = req.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);
  const auth = req.headers.get('authorization');
  if (auth) headers.set('Authorization', auth);

  const body = req.method !== 'GET' && req.method !== 'HEAD'
    ? await req.arrayBuffer()
    : undefined;

  const res = await fetch(url.toString(), {
    method:  req.method,
    headers,
    body,
  });

  const data = await res.text();

  return new NextResponse(data, {
    status:  res.status,
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
  });
}

export const GET    = handler;
export const POST   = handler;
export const PATCH  = handler;
export const PUT    = handler;
export const DELETE = handler;
