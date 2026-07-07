import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { getBackendUrl } from '../../../_utils/backend-url';

// ----------------------------------------------------------------------
// GET /api/v1/company/kitchens
//
// Company admin uchun barcha faol oshxonalar ro'yxati.
// ----------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });

  const backend = getBackendUrl(req, '/api/v1/company/kitchens');
  if (backend.error) return backend.error;

  try {
    const { url } = backend;
    req.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
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
