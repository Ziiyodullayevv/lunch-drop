import { createElement } from 'react';
import { waitFor, renderHook } from '@testing-library/react';
import { it, vi, expect, describe, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('src/lib/api/orders', () => ({
  fetchPendingEmployees: vi.fn(),
  updateEmployeeStatus:  vi.fn(),
  fetchKitchenOrders:    vi.fn(),
  updateOrderStatus:     vi.fn(),
  bulkConfirmOrders:     vi.fn(),
  fetchInvoices:         vi.fn(),
}));

import * as api from 'src/lib/api/orders';

import { usePendingEmployees, useUpdateEmployeeStatus } from './use-employees';

// ----------------------------------------------------------------------

const mockFetchPendingEmployees = vi.mocked(api.fetchPendingEmployees);
const mockUpdateEmployeeStatus  = vi.mocked(api.updateEmployeeStatus);

const mockEmployee = {
  id: 'e-1', phone: '+998901234567', name: 'Bobur Toshmatov',
  branch_id: 'b-1', account_status: 'pending_approval' as const, created_at: '2024-01-01T00:00:00Z',
};

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => vi.clearAllMocks());

// ----------------------------------------------------------------------

describe('usePendingEmployees', () => {
  it("pending xodimlar ro'yxatini yuklaydi", async () => {
    mockFetchPendingEmployees.mockResolvedValueOnce([mockEmployee]);
    const { result } = renderHook(() => usePendingEmployees(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].account_status).toBe('pending_approval');
  });

  it("bo'sh ro'yxat qaytarishi mumkin", async () => {
    mockFetchPendingEmployees.mockResolvedValueOnce([]);
    const { result } = renderHook(() => usePendingEmployees(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toHaveLength(0);
  });

  it("server xatosida isError bo'ladi", async () => {
    mockFetchPendingEmployees.mockRejectedValueOnce(new Error('403 Forbidden'));
    const { result } = renderHook(() => usePendingEmployees(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useUpdateEmployeeStatus', () => {
  it("xodimni tasdiqlaydi (approved)", async () => {
    mockUpdateEmployeeStatus.mockResolvedValueOnce({ id: 'e-1', account_status: 'approved' });
    const { result } = renderHook(() => useUpdateEmployeeStatus(), { wrapper });
    const res = await result.current.mutateAsync({ id: 'e-1', status: 'approved' });
    expect(res.account_status).toBe('approved');
    expect(mockUpdateEmployeeStatus).toHaveBeenCalledWith('e-1', 'approved');
  });

  it("xodimni rad etadi (rejected)", async () => {
    mockUpdateEmployeeStatus.mockResolvedValueOnce({ id: 'e-1', account_status: 'rejected' });
    const { result } = renderHook(() => useUpdateEmployeeStatus(), { wrapper });
    const res = await result.current.mutateAsync({ id: 'e-1', status: 'rejected' });
    expect(res.account_status).toBe('rejected');
  });

  it("xodimni faolsizlashtiradi (inactive)", async () => {
    mockUpdateEmployeeStatus.mockResolvedValueOnce({ id: 'e-1', account_status: 'inactive' });
    const { result } = renderHook(() => useUpdateEmployeeStatus(), { wrapper });
    const res = await result.current.mutateAsync({ id: 'e-1', status: 'inactive' });
    expect(res.account_status).toBe('inactive');
  });

  it("server xatosida reject qiladi", async () => {
    mockUpdateEmployeeStatus.mockRejectedValueOnce(new Error('Topilmadi'));
    const { result } = renderHook(() => useUpdateEmployeeStatus(), { wrapper });
    await expect(
      result.current.mutateAsync({ id: 'e-1', status: 'approved' })
    ).rejects.toThrow('Topilmadi');
  });
});
