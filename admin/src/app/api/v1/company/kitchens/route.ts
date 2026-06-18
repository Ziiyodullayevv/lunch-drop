import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

// ----------------------------------------------------------------------
// GET /api/v1/company/kitchens
//
// Company admin uchun barcha faol oshxonalar ro'yxati.
// ----------------------------------------------------------------------

const BACKEND = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://164.90.210.222:8000';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });

  try {
    const url = new URL('/api/v1/company/kitchens', BACKEND);
    req.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
    });

    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return NextResponse.json({ detail: 'Server error' }, { status: 500 });
  }
}
