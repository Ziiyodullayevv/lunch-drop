import { createElement } from 'react';
import { waitFor, renderHook } from '@testing-library/react';
import { it, vi, expect, describe, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('src/lib/api/kitchens', () => ({
  fetchKitchens:     vi.fn(),
  fetchKitchen:      vi.fn(),
  createKitchen:     vi.fn(),
  updateKitchen:     vi.fn(),
  deleteKitchen:     vi.fn(),
  fetchPendingAdmins: vi.fn(),
  approveAdmin:      vi.fn(),
  rejectAdmin:       vi.fn(),
}));

import * as api from 'src/lib/api/kitchens';

import {
  useKitchen,
  useKitchens,
  useRejectAdmin,
  useApproveAdmin,
  useCreateKitchen,
  useDeleteKitchen,
  usePendingAdmins,
  useUpdateKitchen,
} from './use-kitchens';

// ----------------------------------------------------------------------

const mockFetchKitchens     = vi.mocked(api.fetchKitchens);
const mockFetchKitchen      = vi.mocked(api.fetchKitchen);
const mockCreateKitchen     = vi.mocked(api.createKitchen);
const mockUpdateKitchen     = vi.mocked(api.updateKitchen);
const mockDeleteKitchen     = vi.mocked(api.deleteKitchen);
const mockFetchPendingAdmins = vi.mocked(api.fetchPendingAdmins);
const mockApproveAdmin      = vi.mocked(api.approveAdmin);
const mockRejectAdmin       = vi.mocked(api.rejectAdmin);

const mockKitchen = {
  id: 'k-1', name: "Ali's Kitchen", description: null, phone: null,
  image_url: null,
  lat: 41.2995, lng: 69.2401,
  order_cutoff_time: '10:30:00', delivery_start_time: '12:30:00', delivery_end_time: '13:00:00',
  is_active: true, created_at: '2024-01-01T00:00:00Z',
};

const mockUser = {
  id: 'u-1', phone: '+998901234567', name: 'Ali', role: 'kitchen_admin',
  is_active: true, account_status: 'approved', company_id: null, branch_id: null, kitchen_id: 'k-1',
};

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => vi.clearAllMocks());

// ----------------------------------------------------------------------

describe('useKitchens', () => {
  it("oshxonalar ro'yxatini yuklaydi", async () => {
    mockFetchKitchens.mockResolvedValueOnce({ items: [mockKitchen], total: 1, limit: 20, offset: 0 });
    const { result } = renderHook(() => useKitchens(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.items[0].id).toBe('k-1');
  });

  it("server xatosida isError bo'ladi", async () => {
    mockFetchKitchens.mockRejectedValueOnce(new Error('503'));
    const { result } = renderHook(() => useKitchens(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useKitchen', () => {
  it("bitta oshxonani yuklaydi", async () => {
    mockFetchKitchen.mockResolvedValueOnce(mockKitchen);
    const { result } = renderHook(() => useKitchen('k-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.order_cutoff_time).toBe('10:30:00');
  });

  it("bo'sh id bilan query ishlamaydi", () => {
    const { result } = renderHook(() => useKitchen(''), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockFetchKitchen).not.toHaveBeenCalled();
  });
});

describe('useCreateKitchen', () => {
  it("oshxona yaratadi", async () => {
    mockCreateKitchen.mockResolvedValueOnce(mockKitchen);
    const { result } = renderHook(() => useCreateKitchen(), { wrapper });
    const created = await result.current.mutateAsync({ name: "Ali's Kitchen", lat: 41.2995, lng: 69.2401 });
    expect(created.id).toBe('k-1');
  });
});

describe('useUpdateKitchen', () => {
  it("oshxonani yangilaydi", async () => {
    mockUpdateKitchen.mockResolvedValueOnce({ ...mockKitchen, name: 'Yangi nom' });
    const { result } = renderHook(() => useUpdateKitchen('k-1'), { wrapper });
    const updated = await result.current.mutateAsync({ name: 'Yangi nom' });
    expect(updated.name).toBe('Yangi nom');
  });
});

describe('useDeleteKitchen', () => {
  it("oshxonani o'chiradi", async () => {
    mockDeleteKitchen.mockResolvedValueOnce({ status: 204, data: null, headers: {}, config: {} as any, statusText: '' });
    const { result } = renderHook(() => useDeleteKitchen(), { wrapper });
    await result.current.mutateAsync('k-1');
    expect(mockDeleteKitchen).toHaveBeenCalledWith('k-1');
  });
});

// ----------------------------------------------------------------------

describe('usePendingAdmins', () => {
  it("pending adminlar ro'yxatini yuklaydi", async () => {
    const pending = [{ id: 'u-1', full_name: 'Ali', phone: '+998901234567', role: 'kitchen_admin' as const, account_status: 'pending_approval', created_at: '2024-01-01T00:00:00Z' }];
    mockFetchPendingAdmins.mockResolvedValueOnce(pending);
    const { result } = renderHook(() => usePendingAdmins(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].role).toBe('kitchen_admin');
  });
});

describe('useApproveAdmin', () => {
  it("adminni tasdiqlaydi", async () => {
    mockApproveAdmin.mockResolvedValueOnce(mockUser);
    const { result } = renderHook(() => useApproveAdmin(), { wrapper });
    const res = await result.current.mutateAsync('u-1');
    expect(res.account_status).toBe('approved');
    expect(mockApproveAdmin).toHaveBeenCalledWith('u-1');
  });
});

describe('useRejectAdmin', () => {
  it("adminni rad etadi", async () => {
    mockRejectAdmin.mockResolvedValueOnce({ ...mockUser, account_status: 'rejected' });
    const { result } = renderHook(() => useRejectAdmin(), { wrapper });
    const res = await result.current.mutateAsync('u-1');
    expect(res.account_status).toBe('rejected');
  });
});
