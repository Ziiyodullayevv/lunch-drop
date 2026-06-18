import { it, vi, expect, describe, beforeEach } from 'vitest';

vi.mock('src/lib/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  fetcher: vi.fn(),
  endpoints: {
    kitchen: {
      orders:      '/api/v1/kitchen/orders',
      order:       (id: string) => `/api/v1/kitchen/orders/${id}`,
      orderStatus: (id: string) => `/api/v1/kitchen/orders/${id}/status`,
    },
    superAdmin: {
      orders: '/api/v1/super-admin/orders',
      order:  (id: string) => `/api/v1/super-admin/orders/${id}`,
    },
    company: {
      pendingEmployees: '/api/v1/company/employees/pending',
      employeeStatus:   (id: string) => `/api/v1/company/employees/${id}/status`,
      orders:           '/api/v1/company/orders',
      bulkConfirm:      '/api/v1/company/orders/bulk-confirm',
      invoices:         '/api/v1/company/invoices',
    },
  },
}));

import axiosInstance, { fetcher } from 'src/lib/axios';

import {
  fetchInvoices, bulkConfirmOrders, updateOrderStatus,
  fetchKitchenOrder, fetchCompanyOrders, fetchKitchenOrders, updateEmployeeStatus,
  fetchSuperAdminOrder,
  fetchPendingEmployees, fetchSuperAdminOrders,
} from './orders';

const mockAxios   = vi.mocked(axiosInstance);
const mockFetcher = vi.mocked(fetcher);

const mockOrder = {
  id: 'o-1', employee_id: 'u-1', kitchen_id: 'k-1', meal_id: 'm-1',
  target_date: '2024-01-15', historical_price: '25000.00', system_fee: '1250.00',
  status: 'created', created_at: '2024-01-15T09:00:00Z',
  employee_name: 'Bobur', branch_id: 'b-1', branch_name: 'Chilonzor',
  company_id: 'c-1', company_name: 'Lunch Drop', kitchen_name: 'Oshxona',
  meal_name: 'Osh',
};

const mockEmployee = {
  id: 'e-1', phone: '+998901234567', name: 'Bobur',
  branch_id: 'b-1', account_status: 'pending_approval', created_at: '2024-01-01T00:00:00Z',
};

const mockInvoice = {
  id: 'inv-1', company_id: 'c-1',
  period_start: '2024-01-01', period_end: '2024-01-31',
  total_company_expense: '2500000.00', total_system_fee: '125000.00', total_kitchen_profit: '2375000.00',
  status: 'pending', created_at: '2024-02-01T00:00:00Z',
};

beforeEach(() => vi.clearAllMocks());

// ----------------------------------------------------------------------

describe('fetchKitchenOrders', () => {
  it("buyurtmalar ro'yxatini qaytaradi", async () => {
    mockFetcher.mockResolvedValueOnce([mockOrder]);
    const result = await fetchKitchenOrders();
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('created');
  });

  it("bo'sh array qaytarishi mumkin", async () => {
    mockFetcher.mockResolvedValueOnce([]);
    expect(await fetchKitchenOrders()).toHaveLength(0);
  });

  it("xato bo'lsa reject qiladi", async () => {
    mockFetcher.mockRejectedValueOnce(new Error('403'));
    await expect(fetchKitchenOrders()).rejects.toThrow();
  });
});

describe('fetchKitchenOrder', () => {
  it("bitta buyurtma tafsilotini qaytaradi", async () => {
    mockFetcher.mockResolvedValueOnce(mockOrder);
    const result = await fetchKitchenOrder('o-1');
    expect(result.id).toBe('o-1');
    expect(mockFetcher).toHaveBeenCalledWith('/api/v1/kitchen/orders/o-1');
  });
});

describe('super admin orders', () => {
  it("to'g'ri super-admin endpointidan paginated ro'yxatni oladi", async () => {
    const page = { items: [mockOrder], total: 1, limit: 20, offset: 0 };
    mockFetcher.mockResolvedValueOnce(page);

    const result = await fetchSuperAdminOrders({
      order_status: 'created',
      limit: 20,
      offset: 0,
    });

    expect(result.total).toBe(1);
    expect(mockFetcher).toHaveBeenCalledWith([
      '/api/v1/super-admin/orders',
      { params: { order_status: 'created', limit: 20, offset: 0 } },
    ]);
  });

  it("qidiruvda barcha API sahifalarini tekshiradi va natijani paginate qiladi", async () => {
    const matchingOrder = {
      ...mockOrder,
      id: 'o-101',
      company_name: 'Mars IT',
      branch_name: 'Tinchlik filiali',
    };
    mockFetcher
      .mockResolvedValueOnce({
        items: [mockOrder],
        total: 101,
        limit: 100,
        offset: 0,
      })
      .mockResolvedValueOnce({
        items: [matchingOrder],
        total: 101,
        limit: 100,
        offset: 100,
      });

    const result = await fetchSuperAdminOrders({
      order_status: 'created',
      search: 'mars tinchlik',
      limit: 10,
      offset: 0,
    });

    expect(result.items).toEqual([matchingOrder]);
    expect(result.total).toBe(1);
    expect(mockFetcher).toHaveBeenNthCalledWith(1, [
      '/api/v1/super-admin/orders',
      { params: { limit: 100, offset: 0 } },
    ]);
    expect(mockFetcher).toHaveBeenNthCalledWith(2, [
      '/api/v1/super-admin/orders',
      { params: { limit: 100, offset: 100 } },
    ]);
    expect(result.status_counts).toMatchObject({
      all: 1,
      active: 1,
      created: 1,
      delivered: 0,
    });
  });

  it("sana oralig'ini barcha super-admin sahifalarida inclusive filter qiladi", async () => {
    const olderOrder = {
      ...mockOrder,
      id: 'o-old',
      target_date: '2026-05-31',
    };
    const firstMatchingOrder = {
      ...mockOrder,
      id: 'o-match-1',
      target_date: '2026-06-01',
    };
    const secondMatchingOrder = {
      ...mockOrder,
      id: 'o-match-2',
      target_date: '2026-06-12',
    };
    const futureOrder = {
      ...mockOrder,
      id: 'o-future',
      target_date: '2026-06-13',
    };

    mockFetcher
      .mockResolvedValueOnce({
        items: [olderOrder, firstMatchingOrder],
        total: 101,
        limit: 100,
        offset: 0,
      })
      .mockResolvedValueOnce({
        items: [secondMatchingOrder, futureOrder],
        total: 101,
        limit: 100,
        offset: 100,
      });

    const result = await fetchSuperAdminOrders({
      company_id: 'c-1',
      start_date: '2026-06-01',
      end_date: '2026-06-12',
      limit: 10,
      offset: 0,
    });

    expect(result.items).toEqual([firstMatchingOrder, secondMatchingOrder]);
    expect(result.total).toBe(2);
    expect(mockFetcher).toHaveBeenNthCalledWith(1, [
      '/api/v1/super-admin/orders',
      { params: { company_id: 'c-1', limit: 100, offset: 0 } },
    ]);
    expect(mockFetcher).toHaveBeenNthCalledWith(2, [
      '/api/v1/super-admin/orders',
      { params: { company_id: 'c-1', limit: 100, offset: 100 } },
    ]);
  });

  it("super admin order detail endpointini ishlatadi", async () => {
    mockFetcher.mockResolvedValueOnce(mockOrder);

    const result = await fetchSuperAdminOrder('o-1');

    expect(result.id).toBe('o-1');
    expect(mockFetcher).toHaveBeenCalledWith('/api/v1/super-admin/orders/o-1');
  });
});

describe('company admin orders', () => {
  it("sana berilmasa barcha sanalarni company endpointidan oladi", async () => {
    const page = { items: [mockOrder], total: 1, limit: 10, offset: 0 };
    mockFetcher.mockResolvedValueOnce(page);

    const result = await fetchCompanyOrders({
      order_status: 'on_the_way',
      limit: 10,
      offset: 0,
    });

    expect(result.total).toBe(1);
    expect(mockFetcher).toHaveBeenCalledWith([
      '/api/v1/company/orders',
      { params: { order_status: 'on_the_way', limit: 10, offset: 0 } },
    ]);
  });

  it("sana oralig'ida barcha API sahifalarini filter qilib paginate qiladi", async () => {
    const olderOrder = {
      ...mockOrder,
      id: 'o-old',
      target_date: '2026-05-31',
    };
    const firstMatchingOrder = {
      ...mockOrder,
      id: 'o-match-1',
      target_date: '2026-06-01',
    };
    const secondMatchingOrder = {
      ...mockOrder,
      id: 'o-match-2',
      target_date: '2026-06-12',
    };
    const futureOrder = {
      ...mockOrder,
      id: 'o-future',
      target_date: '2026-06-13',
    };

    mockFetcher
      .mockResolvedValueOnce({
        items: [olderOrder, firstMatchingOrder],
        total: 101,
        limit: 100,
        offset: 0,
      })
      .mockResolvedValueOnce({
        items: [secondMatchingOrder, futureOrder],
        total: 101,
        limit: 100,
        offset: 100,
      });

    const result = await fetchCompanyOrders({
      start_date: '2026-06-01',
      end_date: '2026-06-12',
      limit: 10,
      offset: 0,
    });

    expect(result.items).toEqual([firstMatchingOrder, secondMatchingOrder]);
    expect(result.total).toBe(2);
    expect(mockFetcher).toHaveBeenNthCalledWith(1, [
      '/api/v1/company/orders',
      { params: { limit: 100, offset: 0 } },
    ]);
    expect(mockFetcher).toHaveBeenNthCalledWith(2, [
      '/api/v1/company/orders',
      { params: { limit: 100, offset: 100 } },
    ]);
  });

  it("tanlangan statusni filter qiladi va barcha status sonlarini saqlaydi", async () => {
    const createdOrder = {
      ...mockOrder,
      id: 'o-created',
      target_date: '2026-06-11',
    };
    const deliveredOrder = {
      ...mockOrder,
      id: 'o-delivered',
      status: 'delivered' as const,
      target_date: '2026-06-12',
    };

    mockFetcher.mockResolvedValueOnce({
      items: [createdOrder, deliveredOrder],
      total: 2,
      limit: 100,
      offset: 0,
    });

    const result = await fetchCompanyOrders({
      end_date: '2026-06-12',
      order_status: 'delivered',
      limit: 10,
      offset: 0,
    });

    expect(result.items).toEqual([deliveredOrder]);
    expect(result.total).toBe(1);
    expect(result.status_counts).toEqual({
      all: 2,
      active: 1,
      created: 1,
      preparing: 0,
      on_the_way: 0,
      delivered: 1,
      cancelled: 0,
    });
    expect(result.analytics).toMatchObject({
      total: 2,
      totalAmount: 50000,
      active: 1,
      activeAmount: 25000,
      delivered: 1,
      deliveredAmount: 25000,
    });
    expect(mockFetcher).toHaveBeenCalledWith([
      '/api/v1/company/orders',
      { params: { limit: 100, offset: 0 } },
    ]);
  });
});

describe('updateOrderStatus', () => {
  it("created → preparing o'zgartiradi", async () => {
    mockAxios.patch.mockResolvedValueOnce({ data: { ...mockOrder, status: 'preparing' } });
    const result = await updateOrderStatus('o-1', 'preparing');
    expect(result.status).toBe('preparing');
    expect(mockAxios.patch).toHaveBeenCalledWith('/api/v1/kitchen/orders/o-1/status', { status: 'preparing' });
  });

  it("delivered holatiga o'tkaziladi", async () => {
    mockAxios.patch.mockResolvedValueOnce({ data: { ...mockOrder, status: 'delivered' } });
    expect((await updateOrderStatus('o-1', 'delivered')).status).toBe('delivered');
  });

  it("cancelled holatiga o'tkaziladi", async () => {
    mockAxios.patch.mockResolvedValueOnce({ data: { ...mockOrder, status: 'cancelled' } });
    expect((await updateOrderStatus('o-1', 'cancelled')).status).toBe('cancelled');
  });
});

// ----------------------------------------------------------------------

describe('fetchPendingEmployees', () => {
  it("pending xodimlar ro'yxatini qaytaradi", async () => {
    mockFetcher.mockResolvedValueOnce([mockEmployee]);
    const result = await fetchPendingEmployees();
    expect(result).toHaveLength(1);
    expect(result[0].account_status).toBe('pending_approval');
  });

  it("bo'sh array qaytarishi mumkin", async () => {
    mockFetcher.mockResolvedValueOnce([]);
    expect(await fetchPendingEmployees()).toHaveLength(0);
  });
});

describe('updateEmployeeStatus', () => {
  it("approved holatiga o'tkazadi", async () => {
    mockAxios.patch.mockResolvedValueOnce({ data: { id: 'e-1', account_status: 'approved' } });
    const result = await updateEmployeeStatus('e-1', 'approved');
    expect(result.account_status).toBe('approved');
    expect(mockAxios.patch).toHaveBeenCalledWith(
      '/api/v1/company/employees/e-1/status',
      { status: 'approved' }
    );
  });

  it("rejected holatiga o'tkazadi", async () => {
    mockAxios.patch.mockResolvedValueOnce({ data: { id: 'e-1', account_status: 'rejected' } });
    expect((await updateEmployeeStatus('e-1', 'rejected')).account_status).toBe('rejected');
  });

  it("inactive holatiga o'tkazadi", async () => {
    mockAxios.patch.mockResolvedValueOnce({ data: { id: 'e-1', account_status: 'inactive' } });
    expect((await updateEmployeeStatus('e-1', 'inactive')).account_status).toBe('inactive');
  });
});

describe('bulkConfirmOrders', () => {
  it("confirmed sonini qaytaradi", async () => {
    mockAxios.patch.mockResolvedValueOnce({ data: { confirmed: 5 } });
    const result = await bulkConfirmOrders();
    expect(result.confirmed).toBe(5);
    expect(mockAxios.patch).toHaveBeenCalledWith('/api/v1/company/orders/bulk-confirm');
  });

  it("0 confirmed ham to'g'ri", async () => {
    mockAxios.patch.mockResolvedValueOnce({ data: { confirmed: 0 } });
    expect((await bulkConfirmOrders()).confirmed).toBe(0);
  });
});

describe('fetchInvoices', () => {
  it("invoice'lar ro'yxatini qaytaradi", async () => {
    mockFetcher.mockResolvedValueOnce([mockInvoice]);
    const result = await fetchInvoices();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('inv-1');
  });

  it("financial ma'lumotlar string formatida", async () => {
    mockFetcher.mockResolvedValueOnce([mockInvoice]);
    const result = await fetchInvoices();
    expect(typeof result[0].total_company_expense).toBe('string');
    expect(typeof result[0].total_system_fee).toBe('string');
  });

  it("paid status ham qaytarishi mumkin", async () => {
    mockFetcher.mockResolvedValueOnce([{ ...mockInvoice, status: 'paid' }]);
    expect((await fetchInvoices())[0].status).toBe('paid');
  });
});
