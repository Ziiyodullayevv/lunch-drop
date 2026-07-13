import { createElement } from 'react';
import { waitFor, renderHook } from '@testing-library/react';
import { it, vi, expect, describe, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('src/lib/api/companies', () => ({
  fetchBranchesWithKitchenIds: vi.fn(),
  fetchBranch:    vi.fn(),
  createBranch:   vi.fn(),
  updateBranch:   vi.fn(),
  deleteBranch:   vi.fn(),
  assignKitchens: vi.fn(),
  fetchCompanies: vi.fn(),
  fetchCompany:   vi.fn(),
  createCompany:  vi.fn(),
  updateCompany:  vi.fn(),
  deleteCompany:  vi.fn(),
}));

import * as api from 'src/lib/api/companies';

import {
  useBranch,
  useBranches,
  useCreateBranch,
  useDeleteBranch,
  useUpdateBranch,
  useAssignKitchens,
} from './use-branches';

// ----------------------------------------------------------------------

const mockFetchBranches  = vi.mocked(api.fetchBranchesWithKitchenIds);
const mockFetchBranch    = vi.mocked(api.fetchBranch);
const mockCreateBranch   = vi.mocked(api.createBranch);
const mockUpdateBranch   = vi.mocked(api.updateBranch);
const mockDeleteBranch   = vi.mocked(api.deleteBranch);
const mockAssignKitchens = vi.mocked(api.assignKitchens);

const mockBranch = {
  id: 'b-1', company_id: 'c-1', name: 'Chilonzor filiali',
  address: 'Chilonzor 4', lat: 41.2995, lng: 69.2401, created_at: '2024-01-01T00:00:00Z',
};

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => vi.clearAllMocks());

// ----------------------------------------------------------------------

describe('useBranches', () => {
  it("filiallar ro'yxatini yuklaydi", async () => {
    mockFetchBranches.mockResolvedValueOnce({ items: [mockBranch], total: 1, limit: 20, offset: 0 });
    const { result } = renderHook(() => useBranches(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.items).toHaveLength(1);
    expect(result.current.data?.items[0].id).toBe('b-1');
  });

  it("company_id filter bilan yuklaydi", async () => {
    mockFetchBranches.mockResolvedValueOnce({ items: [mockBranch], total: 1, limit: 20, offset: 0 });
    const { result } = renderHook(() => useBranches({ company_id: 'c-1' }), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFetchBranches).toHaveBeenCalledWith({ company_id: 'c-1' });
  });

  it("server xatosida isError bo'ladi", async () => {
    mockFetchBranches.mockRejectedValueOnce(new Error('500'));
    const { result } = renderHook(() => useBranches(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useBranch', () => {
  it("bitta filialni yuklaydi", async () => {
    mockFetchBranch.mockResolvedValueOnce(mockBranch);
    const { result } = renderHook(() => useBranch('b-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.address).toBe('Chilonzor 4');
  });

  it("bo'sh id bilan query ishlamaydi", () => {
    const { result } = renderHook(() => useBranch(''), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockFetchBranch).not.toHaveBeenCalled();
  });
});

describe('useCreateBranch', () => {
  it("yangi filial yaratadi", async () => {
    mockCreateBranch.mockResolvedValueOnce(mockBranch);
    const { result } = renderHook(() => useCreateBranch(), { wrapper });
    const created = await result.current.mutateAsync({
      company_id: 'c-1', name: 'Chilonzor filiali', address: 'Chilonzor 4', lat: 41.2995, lng: 69.2401,
    });
    expect(created.id).toBe('b-1');
  });
});

describe('useUpdateBranch', () => {
  it("filialni yangilaydi", async () => {
    mockUpdateBranch.mockResolvedValueOnce({ ...mockBranch, name: 'Yangilangan filial' });
    const { result } = renderHook(() => useUpdateBranch('b-1'), { wrapper });
    const updated = await result.current.mutateAsync({ name: 'Yangilangan filial' });
    expect(updated.name).toBe('Yangilangan filial');
  });
});

describe('useDeleteBranch', () => {
  it("filialni o'chiradi", async () => {
    mockDeleteBranch.mockResolvedValueOnce({ status: 204, data: null, headers: {}, config: {} as any, statusText: '' });
    const { result } = renderHook(() => useDeleteBranch(), { wrapper });
    await result.current.mutateAsync('b-1');
    expect(mockDeleteBranch).toHaveBeenCalledWith('b-1');
  });
});

describe('useAssignKitchens', () => {
  it("oshxonalarni filiallga biriktiradi", async () => {
    mockAssignKitchens.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useAssignKitchens('b-1'), { wrapper });
    await result.current.mutateAsync(['k-1', 'k-2']);
    expect(mockAssignKitchens).toHaveBeenCalledWith('b-1', ['k-1', 'k-2']);
  });

  it("bo'sh array bilan ham ishlaydi", async () => {
    mockAssignKitchens.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useAssignKitchens('b-1'), { wrapper });
    await result.current.mutateAsync([]);
    expect(mockAssignKitchens).toHaveBeenCalledWith('b-1', []);
  });
});
