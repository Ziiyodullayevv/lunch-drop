import { it, vi, expect, describe, beforeEach } from 'vitest';

vi.mock('src/lib/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  fetcher: vi.fn(),
  endpoints: {
    kitchen: {
      orders:      '/api/v1/kitchen/orders',
      orderStatus: (id: string) => `/api/v1/kitchen/orders/${id}/status`,
    },
    company: {
      pendingEmployees: '/api/v1/company/employees/pending',
      employeeStatus:   (id: string) => `/api/v1/company/employees/${id}/status`,
      bulkConfirm:      '/api/v1/company/orders/bulk-confirm',
      invoices:         '/api/v1/company/invoices',
    },
  },
}));

import axiosInstance, { fetcher } from 'src/lib/axios';

import {
  fetchInvoices, bulkConfirmOrders, updateOrderStatus,
  fetchKitchenOrders, updateEmployeeStatus, fetchPendingEmployees,
} from './orders';

const mockAxios   = vi.mocked(axiosInstance);
const mockFetcher = vi.mocked(fetcher);

const mockOrder = {
  id: 'o-1', employee_id: 'u-1', kitchen_id: 'k-1', meal_id: 'm-1',
  target_date: '2024-01-15', historical_price: '25000.00', system_fee: '1250.00',
  status: 'created', created_at: '2024-01-15T09:00:00Z',
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
