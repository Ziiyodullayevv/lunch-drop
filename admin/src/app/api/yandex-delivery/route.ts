import type { NextRequest } from 'next/server';

import nodePath from 'node:path';
import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';

// ----------------------------------------------------------------------

const BACKEND = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://164.90.210.222:8000';
const YANDEX_BASE_URL = 'https://b2b.taxi.yandex.net';
const DEFAULT_TOKEN_FILE = nodePath.join(
  /* turbopackIgnore: true */ process.cwd(),
  '.secrets',
  'yandex-delivery-token'
);

type ProxyRequest = {
  action?: 'check-price' | 'create' | 'info' | 'accept' | 'tracking-links';
  claimId?: string;
  requestId?: string;
  version?: number;
  payload?: unknown;
};

async function requireKitchenAdmin(req: NextRequest) {
  const authorization = req.headers.get('authorization');

  if (!authorization) {
    return { error: NextResponse.json({ detail: 'Unauthorized' }, { status: 401 }) };
  }

  try {
    const response = await fetch(new URL('/api/v1/auth/me', BACKEND), {
      headers: { Authorization: authorization },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return { error: NextResponse.json({ detail: 'Unauthorized' }, { status: 401 }) };
    }

    const data = await response.json();
    const user = data?.user ?? data;

    if (user?.role !== 'kitchen_admin') {
      return { error: NextResponse.json({ detail: 'Forbidden' }, { status: 403 }) };
    }

    return { error: null };
  } catch {
    return {
      error: NextResponse.json(
        { detail: "LunchDrop autentifikatsiyasini tekshirib bo'lmadi" },
        { status: 502 }
      ),
    };
  }
}

async function getYandexToken() {
  const envToken = process.env.YANDEX_DELIVERY_TOKEN?.trim();
  if (envToken) return envToken;

  const configuredPath = process.env.YANDEX_DELIVERY_TOKEN_FILE?.trim();
  const tokenFile = configuredPath
    ? nodePath.resolve(/* turbopackIgnore: true */ process.cwd(), configuredPath)
    : DEFAULT_TOKEN_FILE;

  try {
    return (await readFile(tokenFile, 'utf8')).trim();
  } catch {
    return '';
  }
}

async function callYandex(pathname: string, body?: unknown, method: 'GET' | 'POST' = 'POST') {
  const token = await getYandexToken();

  if (!token) {
    return NextResponse.json(
      {
        code: 'yandex_not_configured',
        detail: 'Serverda YANDEX_DELIVERY_TOKEN sozlanmagan',
      },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(new URL(pathname, YANDEX_BASE_URL), {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept-Language': 'ru',
        'Content-Type': 'application/json',
      },
      body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(25_000),
    });
    const data = await response.text();

    if (response.status === 401) {
      return NextResponse.json(
        {
          code: 'yandex_token_invalid',
          detail:
            "Yandex token yaroqsiz. Biznes kabinetidan yangi token oling va server secretini yangilang.",
        },
        { status: 401 }
      );
    }

    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('content-type') ?? 'application/json' },
    });
  } catch {
    return NextResponse.json(
      { code: 'yandex_unavailable', detail: "Yandex Delivery bilan bog'lanib bo'lmadi" },
      { status: 502 }
    );
  }
}

// ----------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const auth = await requireKitchenAdmin(req);
  if (auth.error) return auth.error;

  return NextResponse.json({ configured: Boolean(await getYandexToken()) });
}

export async function POST(req: NextRequest) {
  const auth = await requireKitchenAdmin(req);
  if (auth.error) return auth.error;

  let request: ProxyRequest;

  try {
    request = (await req.json()) as ProxyRequest;
  } catch {
    return NextResponse.json({ detail: "Noto'g'ri JSON" }, { status: 400 });
  }

  if (request.action === 'check-price') {
    return callYandex('/b2b/cargo/integration/v2/check-price', request.payload);
  }

  if (request.action === 'create') {
    if (!request.requestId) {
      return NextResponse.json({ detail: 'requestId majburiy' }, { status: 400 });
    }
    const path = `/b2b/cargo/integration/v2/claims/create?request_id=${encodeURIComponent(request.requestId)}`;
    return callYandex(path, request.payload);
  }

  if (request.action === 'info') {
    if (!request.claimId) {
      return NextResponse.json({ detail: 'claimId majburiy' }, { status: 400 });
    }
    const path = `/b2b/cargo/integration/v2/claims/info?claim_id=${encodeURIComponent(request.claimId)}`;
    return callYandex(path);
  }

  if (request.action === 'accept') {
    if (!request.claimId || typeof request.version !== 'number') {
      return NextResponse.json({ detail: 'claimId va version majburiy' }, { status: 400 });
    }
    const path = `/b2b/cargo/integration/v2/claims/accept?claim_id=${encodeURIComponent(request.claimId)}`;
    return callYandex(path, { version: request.version });
  }

  if (request.action === 'tracking-links') {
    if (!request.claimId) {
      return NextResponse.json({ detail: 'claimId majburiy' }, { status: 400 });
    }
    const path = `/b2b/cargo/integration/v2/claims/tracking-links?claim_id=${encodeURIComponent(request.claimId)}`;
    return callYandex(path, undefined, 'GET');
  }

  return NextResponse.json({ detail: "Noma'lum action" }, { status: 400 });
}
