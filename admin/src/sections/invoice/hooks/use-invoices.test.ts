import { createElement } from 'react';
import { waitFor, renderHook } from '@testing-library/react';
import { it, vi, expect, describe, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('src/lib/api/orders', () => ({
  fetchInvoices:         vi.fn(),
  fetchKitchenOrders:    vi.fn(),
  updateOrderStatus:     vi.fn(),
  bulkConfirmOrders:     vi.fn(),
  fetchPendingEmployees: vi.fn(),
  updateEmployeeStatus:  vi.fn(),
}));

import * as api from 'src/lib/api/orders';

import { useInvoices } from './use-invoices';

// ----------------------------------------------------------------------

const mockFetchInvoices = vi.mocked(api.fetchInvoices);

const mockInvoice = {
  id: 'inv-1', company_id: 'c-1',
  period_start: '2024-01-01', period_end: '2024-01-31',
  total_company_expense: '2500000.00',
  total_system_fee: '125000.00',
  total_kitchen_profit: '2375000.00',
  status: 'pending' as const,
  created_at: '2024-02-01T00:00:00Z',
};

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => vi.clearAllMocks());

// ----------------------------------------------------------------------

describe('useInvoices', () => {
  it("invoice'lar ro'yxatini yuklaydi", async () => {
    mockFetchInvoices.mockResolvedValueOnce([mockInvoice]);
    const { result } = renderHook(() => useInvoices(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].id).toBe('inv-1');
  });

  it("invoice ma'lumotlari to'g'ri tuzilgan", async () => {
    mockFetchInvoices.mockResolvedValueOnce([mockInvoice]);
    const { result } = renderHook(() => useInvoices(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const inv = result.current.data?.[0];
    expect(inv?.period_start).toBe('2024-01-01');
    expect(inv?.period_end).toBe('2024-01-31');
    expect(inv?.total_company_expense).toBe('2500000.00');
    expect(inv?.status).toBe('pending');
  });

  it("bo'sh ro'yxat qaytarishi mumkin", async () => {
    mockFetchInvoices.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useInvoices(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toHaveLength(0);
  });

  it("server xatosida isError bo'ladi", async () => {
    mockFetchInvoices.mockRejectedValueOnce(new Error('403 Forbidden'));
    const { result } = renderHook(() => useInvoices(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("paid status ham qaytarishi mumkin", async () => {
    mockFetchInvoices.mockResolvedValueOnce([{ ...mockInvoice, status: 'paid' }]);
    const { result } = renderHook(() => useInvoices(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.[0].status).toBe('paid');
  });
});
