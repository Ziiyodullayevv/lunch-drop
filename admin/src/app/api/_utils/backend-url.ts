import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

const DEFAULT_BACKEND_URL = 'https://api.lunchdrop.uz';

type BackendUrlResult =
  | { error: null; url: URL }
  | { error: NextResponse; url: null };

function isLoopback(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function isSameAdminOrigin(backendUrl: URL, requestUrl: URL) {
  if (backendUrl.protocol !== requestUrl.protocol || backendUrl.port !== requestUrl.port) {
    return false;
  }

  return backendUrl.hostname === requestUrl.hostname ||
    (isLoopback(backendUrl.hostname) && isLoopback(requestUrl.hostname));
}

export function getBackendUrl(req: NextRequest, pathname: string): BackendUrlResult {
  const configuredUrl =
    process.env.NEXT_SERVER_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_SERVER_URL?.trim() ||
    DEFAULT_BACKEND_URL;

  let backendOrigin: URL;

  try {
    backendOrigin = new URL(configuredUrl);
  } catch {
    return {
      url: null,
      error: NextResponse.json(
        {
          code: 'backend_misconfigured',
          detail: "Backend URL noto'g'ri sozlangan",
        },
        { status: 502 }
      ),
    };
  }

  if (isSameAdminOrigin(backendOrigin, req.nextUrl)) {
    backendOrigin = new URL(DEFAULT_BACKEND_URL);
  }

  return { error: null, url: new URL(pathname, backendOrigin) };
}
