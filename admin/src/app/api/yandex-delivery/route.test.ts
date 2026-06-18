import os from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { rm, mkdtemp, writeFile } from 'node:fs/promises';
import { it, vi, expect, describe, afterEach } from 'vitest';

import { GET, POST } from './route';

const mockFetch = vi.fn();
let tempDirectory: string | undefined;

afterEach(async () => {
  mockFetch.mockReset();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete process.env.YANDEX_DELIVERY_TOKEN;
  delete process.env.YANDEX_DELIVERY_TOKEN_FILE;

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
    tempDirectory = undefined;
  }
});

describe('Yandex Delivery proxy', () => {
  it('reports that Yandex is not configured without exposing a token', async () => {
    process.env.YANDEX_DELIVERY_TOKEN = '';
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ user: { role: 'kitchen_admin' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', mockFetch);

    const response = await GET(
      new NextRequest('http://localhost/api/yandex-delivery', {
        headers: { Authorization: 'Bearer lunchdrop-token' },
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ configured: false });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('reloads a token file without restarting the server', async () => {
    tempDirectory = await mkdtemp(path.join(os.tmpdir(), 'yandex-delivery-token-'));
    const tokenFile = path.join(tempDirectory, 'token');
    process.env.YANDEX_DELIVERY_TOKEN_FILE = tokenFile;
    await writeFile(tokenFile, 'first-server-token\n', 'utf8');

    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ user: { role: 'kitchen_admin' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', mockFetch);

    const request = () =>
      GET(
        new NextRequest('http://localhost/api/yandex-delivery', {
          headers: { Authorization: 'Bearer lunchdrop-token' },
        })
      );

    await expect((await request()).json()).resolves.toEqual({ configured: true });

    await writeFile(tokenFile, 'second-server-token\n', 'utf8');
    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: { role: 'kitchen_admin' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'claim-1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    await POST(
      new NextRequest('http://localhost/api/yandex-delivery', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer lunchdrop-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'info', claimId: 'claim-1' }),
      })
    );

    expect(mockFetch.mock.calls[1]?.[1]).toMatchObject({
      headers: {
        Authorization: 'Bearer second-server-token',
      },
    });
  });

  it('forwards tracking links as an authenticated GET request', async () => {
    process.env.YANDEX_DELIVERY_TOKEN = 'server-only-yandex-token';
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: { role: 'kitchen_admin' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            route_points: [
              {
                id: 2,
                type: 'destination',
                visit_order: 2,
                sharing_link: 'https://example.test/tracking',
              },
            ],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );
    vi.stubGlobal('fetch', mockFetch);

    const response = await POST(
      new NextRequest('http://localhost/api/yandex-delivery', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer lunchdrop-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'tracking-links',
          claimId: '741cedf82cd464fa6fa16d87155c636',
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    const [url, init] = mockFetch.mock.calls[1] as [URL, RequestInit];
    expect(url.toString()).toBe(
      'https://b2b.taxi.yandex.net/b2b/cargo/integration/v2/claims/tracking-links?claim_id=741cedf82cd464fa6fa16d87155c636'
    );
    expect(init).toMatchObject({
      method: 'GET',
      body: undefined,
      headers: {
        Authorization: 'Bearer server-only-yandex-token',
      },
    });
  });

  it('returns a readable error when Yandex rejects the token', async () => {
    process.env.YANDEX_DELIVERY_TOKEN = 'revoked-token';
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: { role: 'kitchen_admin' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    vi.stubGlobal('fetch', mockFetch);

    const response = await POST(
      new NextRequest('http://localhost/api/yandex-delivery', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer lunchdrop-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'info', claimId: 'claim-1' }),
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      code: 'yandex_token_invalid',
    });
  });
});
