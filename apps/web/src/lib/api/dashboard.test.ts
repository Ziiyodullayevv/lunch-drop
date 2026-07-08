import { it, vi, expect, describe, beforeEach } from 'vitest';

vi.mock('src/lib/axios', () => ({
  fetcher: vi.fn(),
  endpoints: {
    superAdmin: { dashboard: '/api/v1/super-admin/dashboard' },
    company: { dashboard: '/api/v1/company/dashboard' },
    kitchen: { dashboard: '/api/v1/kitchen/dashboard' },
  },
}));

import { fetcher } from 'src/lib/axios';

import { fetchDashboard } from './dashboard';

const mockFetcher = vi.mocked(fetcher);

const dashboardResponse = {
  year: 2026,
  timezone: 'Asia/Tashkent' as const,
  generated_at: '2026-06-14T14:57:39+05:00',
  summary: [],
  order_status_totals: {
    created: 0,
    preparing: 0,
    on_the_way: 0,
    delivered: 3,
    cancelled: 0,
  },
  monthly_orders: {
    year: 2026,
    delivered: [0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0],
    cancelled: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
};

beforeEach(() => vi.clearAllMocks());

describe('fetchDashboard', () => {
  it.each([
    ['super_admin', '/api/v1/super-admin/dashboard'],
    ['company_admin', '/api/v1/company/dashboard'],
    ['kitchen_admin', '/api/v1/kitchen/dashboard'],
  ] as const)("%s rolini o'z endpointiga ulaydi", async (role, endpoint) => {
    mockFetcher.mockResolvedValueOnce(dashboardResponse);

    const result = await fetchDashboard(role, 2026);

    expect(result.year).toBe(2026);
    expect(mockFetcher).toHaveBeenCalledWith([endpoint, { params: { year: 2026 } }]);
  });

  it("yil berilmasa query params yubormaydi", async () => {
    mockFetcher.mockResolvedValueOnce(dashboardResponse);

    await fetchDashboard('company_admin');

    expect(mockFetcher).toHaveBeenCalledWith([
      '/api/v1/company/dashboard',
      { params: undefined },
    ]);
  });
});
