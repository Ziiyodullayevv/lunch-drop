import { createElement } from 'react';
import { waitFor, renderHook } from '@testing-library/react';
import { it, vi, expect, describe, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('src/lib/api/orders', () => ({
  fetchKitchenOrders: vi.fn(),
  fetchKitchenOrder: vi.fn(),
  fetchCompanyOrders: vi.fn(),
  fetchSuperAdminOrders: vi.fn(),
  updateOrderStatus:  vi.fn(),
  bulkConfirmOrders:  vi.fn(),
  fetchPendingEmployees: vi.fn(),
  updateEmployeeStatus: vi.fn(),
  fetchInvoices:      vi.fn(),
}));

import * as api from 'src/lib/api/orders';

import {
  useBulkConfirm,
  useCompanyOrders,
  useKitchenOrders,
  useSuperAdminOrders,
  useUpdateOrderStatus,
} from './use-orders';

// ----------------------------------------------------------------------

const mockFetchKitchenOrders = vi.mocked(api.fetchKitchenOrders);
const mockFetchCompanyOrders = vi.mocked(api.fetchCompanyOrders);
const mockFetchSuperAdminOrders = vi.mocked(api.fetchSuperAdminOrders);
const mockUpdateOrderStatus  = vi.mocked(api.updateOrderStatus);
const mockBulkConfirmOrders  = vi.mocked(api.bulkConfirmOrders);

const mockOrder = {
  id: 'o-1', employee_id: 'u-1', kitchen_id: 'k-1', meal_id: 'm-1',
  target_date: '2024-01-15', historical_price: '25000.00', system_fee: '1250.00',
  status: 'created' as const, created_at: '2024-01-15T09:00:00Z',
  employee_name: null, branch_id: null, branch_name: null,
  company_id: null, company_name: null, meal_name: null,
  kitchen_name: null,
};

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => vi.clearAllMocks());

// ----------------------------------------------------------------------

describe('useKitchenOrders', () => {
  it("buyurtmalar ro'yxatini yuklaydi", async () => {
    mockFetchKitchenOrders.mockResolvedValueOnce([mockOrder]);
    const { result } = renderHook(() => useKitchenOrders(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].status).toBe('created');
  });

  it("bo'sh array bilan ham ishlaydi", async () => {
    mockFetchKitchenOrders.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useKitchenOrders(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toHaveLength(0);
  });

  it("server xatosida isError bo'ladi", async () => {
    mockFetchKitchenOrders.mockRejectedValueOnce(new Error('500'));
    const { result } = renderHook(() => useKitchenOrders(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useSuperAdminOrders', () => {
  it("super admin pagination, status va qidiruv filtrini API'ga uzatadi", async () => {
    mockFetchSuperAdminOrders.mockResolvedValueOnce({
      items: [mockOrder],
      total: 1,
      limit: 10,
      offset: 0,
    });

    const params = {
      order_status: 'created' as const,
      company_id: 'c-1',
      branch_id: 'b-1',
      kitchen_id: 'k-1',
      start_date: '2026-06-01',
      end_date: '2026-06-12',
      search: 'bobur',
      limit: 10,
      offset: 0,
    };
    const { result } = renderHook(() => useSuperAdminOrders(params), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.total).toBe(1);
    expect(mockFetchSuperAdminOrders).toHaveBeenCalledWith(params);
  });
});

describe('useCompanyOrders', () => {
  it("company pagination va ixtiyoriy filtrlarni API'ga uzatadi", async () => {
    mockFetchCompanyOrders.mockResolvedValueOnce({
      items: [mockOrder],
      total: 1,
      limit: 10,
      offset: 0,
    });

    const params = {
      order_status: 'on_the_way' as const,
      limit: 10,
      offset: 0,
    };
    const { result } = renderHook(() => useCompanyOrders(params), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.items).toEqual([mockOrder]);
    expect(mockFetchCompanyOrders).toHaveBeenCalledWith(params);
  });
});

describe('useUpdateOrderStatus', () => {
  it("buyurtma holatini o'zgartiradi", async () => {
    mockUpdateOrderStatus.mockResolvedValueOnce({ ...mockOrder, status: 'preparing' });
    const { result } = renderHook(() => useUpdateOrderStatus(), { wrapper });
    const updated = await result.current.mutateAsync({ id: 'o-1', status: 'preparing' });
    expect(updated.status).toBe('preparing');
    expect(mockUpdateOrderStatus).toHaveBeenCalledWith('o-1', 'preparing');
  });

  it("delivered holatiga o'tkaziladi", async () => {
    mockUpdateOrderStatus.mockResolvedValueOnce({ ...mockOrder, status: 'delivered' });
    const { result } = renderHook(() => useUpdateOrderStatus(), { wrapper });
    const updated = await result.current.mutateAsync({ id: 'o-1', status: 'delivered' });
    expect(updated.status).toBe('delivered');
  });

  it("server xatosida reject qiladi", async () => {
    mockUpdateOrderStatus.mockRejectedValueOnce(new Error('403'));
    const { result } = renderHook(() => useUpdateOrderStatus(), { wrapper });
    await expect(
      result.current.mutateAsync({ id: 'o-1', status: 'preparing' })
    ).rejects.toThrow('403');
  });
});

describe('useBulkConfirm', () => {
  it("confirmed sonini qaytaradi", async () => {
    mockBulkConfirmOrders.mockResolvedValueOnce({ confirmed: 7 });
    const { result } = renderHook(() => useBulkConfirm(), { wrapper });
    const res = await result.current.mutateAsync();
    expect(res.confirmed).toBe(7);
    expect(mockBulkConfirmOrders).toHaveBeenCalledOnce();
  });

  it("0 confirmed ham to'g'ri", async () => {
    mockBulkConfirmOrders.mockResolvedValueOnce({ confirmed: 0 });
    const { result } = renderHook(() => useBulkConfirm(), { wrapper });
    const res = await result.current.mutateAsync();
    expect(res.confirmed).toBe(0);
  });
});
