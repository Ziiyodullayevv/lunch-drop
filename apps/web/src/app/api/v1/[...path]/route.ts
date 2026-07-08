import type { NextRequest } from 'next/server';

import { proxyBackendRequest } from '../../_utils/backend-proxy';

// ----------------------------------------------------------------------

async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathname = `/api/v1/${path.join('/')}`;

  return proxyBackendRequest(req, pathname);
}

export const GET    = handler;
export const POST   = handler;
export const PATCH  = handler;
export const PUT    = handler;
export const DELETE = handler;
