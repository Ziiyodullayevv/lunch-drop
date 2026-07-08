import { createElement } from 'react';
import { waitFor, renderHook } from '@testing-library/react';
import { it, vi, expect, describe, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('src/lib/api/companies', () => ({
  fetchCompanies: vi.fn(),
  fetchCompany:   vi.fn(),
  createCompany:  vi.fn(),
  updateCompany:  vi.fn(),
  deleteCompany:  vi.fn(),
  fetchBranches:  vi.fn(),
  fetchBranch:    vi.fn(),
  createBranch:   vi.fn(),
  updateBranch:   vi.fn(),
  deleteBranch:   vi.fn(),
  assignKitchens: vi.fn(),
}));

import * as api from 'src/lib/api/companies';

import {
  useCompany,
  useCompanies,
  useCreateCompany,
  useDeleteCompany,
  useUpdateCompany,
} from './use-companies';

// ----------------------------------------------------------------------

const mockFetchCompanies = vi.mocked(api.fetchCompanies);
const mockFetchCompany   = vi.mocked(api.fetchCompany);
const mockCreateCompany  = vi.mocked(api.createCompany);
const mockUpdateCompany  = vi.mocked(api.updateCompany);
const mockDeleteCompany  = vi.mocked(api.deleteCompany);

const mockCompany = {
  id: 'c-1', name: 'Test Kompaniya', description: null,
  logo_url: null, billing_day: 1, created_at: '2024-01-01T00:00:00Z',
};

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => vi.clearAllMocks());

// ----------------------------------------------------------------------

describe('useCompanies', () => {
  it("kompaniyalar ro'yxatini yuklaydi", async () => {
    mockFetchCompanies.mockResolvedValueOnce({ items: [mockCompany], total: 1, limit: 20, offset: 0 });
    const { result } = renderHook(() => useCompanies(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.items).toHaveLength(1);
    expect(result.current.data?.items[0].id).toBe('c-1');
  });

  it("server xatosida isError bo'ladi", async () => {
    mockFetchCompanies.mockRejectedValueOnce(new Error('Server xatosi'));
    const { result } = renderHook(() => useCompanies(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Server xatosi');
  });
});

describe('useCompany', () => {
  it("bitta kompaniyani yuklaydi", async () => {
    mockFetchCompany.mockResolvedValueOnce(mockCompany);
    const { result } = renderHook(() => useCompany('c-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.name).toBe('Test Kompaniya');
  });

  it("bo'sh id bilan query ishlamaydi (disabled)", () => {
    const { result } = renderHook(() => useCompany(''), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockFetchCompany).not.toHaveBeenCalled();
  });
});

describe('useCreateCompany', () => {
  it("kompaniya yaratadi va success bo'ladi", async () => {
    mockCreateCompany.mockResolvedValueOnce(mockCompany);
    const { result } = renderHook(() => useCreateCompany(), { wrapper });
    await result.current.mutateAsync({ name: 'Test' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockCreateCompany).toHaveBeenCalledWith({ name: 'Test' });
  });

  it("server xatosida isError bo'ladi", async () => {
    mockCreateCompany.mockRejectedValueOnce(new Error('Xato'));
    const { result } = renderHook(() => useCreateCompany(), { wrapper });
    await expect(result.current.mutateAsync({ name: '' })).rejects.toThrow('Xato');
  });
});

describe('useUpdateCompany', () => {
  it("kompaniyani yangilaydi", async () => {
    mockUpdateCompany.mockResolvedValueOnce({ ...mockCompany, name: 'Yangilangan' });
    const { result } = renderHook(() => useUpdateCompany('c-1'), { wrapper });
    const updated = await result.current.mutateAsync({ name: 'Yangilangan' });
    expect(updated.name).toBe('Yangilangan');
  });
});

describe('useDeleteCompany', () => {
  it("kompaniyani o'chiradi", async () => {
    mockDeleteCompany.mockResolvedValueOnce({ status: 204, data: null, headers: {}, config: {} as any, statusText: '' });
    const { result } = renderHook(() => useDeleteCompany(), { wrapper });
    await result.current.mutateAsync('c-1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDeleteCompany).toHaveBeenCalledWith('c-1');
  });
});
