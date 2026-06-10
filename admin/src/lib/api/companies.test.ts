import { it, vi, expect, describe, beforeEach } from 'vitest';

// vi.mock factory ichida tashqi o'zgaruvchi bo'lmaydi — vi.fn() to'g'ridan yoziladi
vi.mock('src/lib/axios', () => ({
  default: {
    get:    vi.fn(),
    post:   vi.fn(),
    patch:  vi.fn(),
    delete: vi.fn(),
  },
  fetcher: vi.fn(),
  endpoints: {
    superAdmin: {
      companies:      '/api/v1/super-admin/companies',
      company:        (id: string) => `/api/v1/super-admin/companies/${id}`,
      branches:       '/api/v1/super-admin/branches',
      branch:         (id: string) => `/api/v1/super-admin/branches/${id}`,
      assignKitchens: (id: string) => `/api/v1/super-admin/branches/${id}/assign-kitchens`,
    },
  },
}));

import axiosInstance, { fetcher } from 'src/lib/axios';

import {
  fetchBranch,
  createBranch,
  deleteBranch,
  fetchCompany,
  updateBranch,
  createCompany,
  deleteCompany,
  fetchBranches,
  updateCompany,
  assignKitchens,
  fetchCompanies,
} from './companies';

// ----------------------------------------------------------------------

const mockAxios  = vi.mocked(axiosInstance);
const mockFetcher = vi.mocked(fetcher);

const mockCompany = {
  id: 'c-1', name: 'Test Kompaniya', description: null,
  logo_url: null, billing_day: 1, created_at: '2024-01-01T00:00:00Z',
};

const mockBranch = {
  id: 'b-1', company_id: 'c-1', name: 'Chilonzor filiali',
  address: 'Toshkent', lat: 41.2995, lng: 69.2401, created_at: '2024-01-01T00:00:00Z',
};

beforeEach(() => vi.clearAllMocks());

// ----------------------------------------------------------------------

describe('fetchCompanies', () => {
  it("kompaniyalar ro'yxatini qaytaradi", async () => {
    mockFetcher.mockResolvedValueOnce({ items: [mockCompany], total: 1, limit: 20, offset: 0 });
    const result = await fetchCompanies();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('c-1');
  });

  it("bo'sh ro'yxat qaytarishi mumkin", async () => {
    mockFetcher.mockResolvedValueOnce({ items: [], total: 0, limit: 20, offset: 0 });
    const result = await fetchCompanies();
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("xato bo'lsa reject qiladi", async () => {
    mockFetcher.mockRejectedValueOnce(new Error('Network error'));
    await expect(fetchCompanies()).rejects.toThrow('Network error');
  });
});

describe('fetchCompany', () => {
  it("bitta kompaniyani qaytaradi", async () => {
    mockFetcher.mockResolvedValueOnce(mockCompany);
    const result = await fetchCompany('c-1');
    expect(result.id).toBe('c-1');
    expect(result.name).toBe('Test Kompaniya');
  });
});

describe('createCompany', () => {
  it("yangi kompaniya yaratadi", async () => {
    mockAxios.post.mockResolvedValueOnce({ data: mockCompany });
    const result = await createCompany({ name: 'Test Kompaniya' });
    expect(result.id).toBe('c-1');
    expect(mockAxios.post).toHaveBeenCalledWith('/api/v1/super-admin/companies', { name: 'Test Kompaniya' });
  });

  it("description bilan yaratiladi", async () => {
    mockAxios.post.mockResolvedValueOnce({ data: { ...mockCompany, description: 'Tavsif' } });
    const result = await createCompany({ name: 'Test', description: 'Tavsif' });
    expect(result.description).toBe('Tavsif');
  });
});

describe('updateCompany', () => {
  it("kompaniyani yangilaydi", async () => {
    mockAxios.patch.mockResolvedValueOnce({ data: { ...mockCompany, name: 'Yangilangan' } });
    const result = await updateCompany('c-1', { name: 'Yangilangan' });
    expect(result.name).toBe('Yangilangan');
  });
});

describe('deleteCompany', () => {
  it("delete endpointga murojaat qiladi", async () => {
    mockAxios.delete.mockResolvedValueOnce({ status: 204 });
    const res = await deleteCompany('c-1');
    expect(res.status).toBe(204);
    expect(mockAxios.delete).toHaveBeenCalledWith('/api/v1/super-admin/companies/c-1');
  });
});

// ----------------------------------------------------------------------

describe('fetchBranches', () => {
  it("filiallar ro'yxatini qaytaradi", async () => {
    mockFetcher.mockResolvedValueOnce({ items: [mockBranch], total: 1, limit: 20, offset: 0 });
    const result = await fetchBranches();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('b-1');
  });

  it("bo'sh ro'yxat qaytarishi mumkin", async () => {
    mockFetcher.mockResolvedValueOnce({ items: [], total: 0, limit: 20, offset: 0 });
    const result = await fetchBranches();
    expect(result.items).toHaveLength(0);
  });
});

describe('fetchBranch', () => {
  it("bitta filialni qaytaradi", async () => {
    mockFetcher.mockResolvedValueOnce(mockBranch);
    const result = await fetchBranch('b-1');
    expect(result.id).toBe('b-1');
    expect(result.company_id).toBe('c-1');
  });
});

describe('createBranch', () => {
  it("yangi filial yaratadi", async () => {
    mockAxios.post.mockResolvedValueOnce({ data: mockBranch });
    const result = await createBranch({
      company_id: 'c-1', name: 'Asosiy filial', address: 'Toshkent', lat: 41.2995, lng: 69.2401,
    });
    expect(result.id).toBe('b-1');
  });
});

describe('updateBranch', () => {
  it("filialni yangilaydi", async () => {
    mockAxios.patch.mockResolvedValueOnce({ data: { ...mockBranch, name: 'Yangilangan filial' } });
    const result = await updateBranch('b-1', { name: 'Yangilangan filial' });
    expect(result.name).toBe('Yangilangan filial');
  });
});

describe('deleteBranch', () => {
  it("delete endpointga murojaat qiladi", async () => {
    mockAxios.delete.mockResolvedValueOnce({ status: 204 });
    const res = await deleteBranch('b-1');
    expect(res.status).toBe(204);
  });
});

describe('assignKitchens', () => {
  it("kitchen_ids bilan post qiladi", async () => {
    mockAxios.post.mockResolvedValueOnce({ status: 204 });
    const res = await assignKitchens('b-1', ['k-1', 'k-2']);
    expect(res.status).toBe(204);
    expect(mockAxios.post).toHaveBeenCalledWith(
      '/api/v1/super-admin/branches/b-1/assign-kitchens',
      { kitchen_ids: ['k-1', 'k-2'] }
    );
  });

  it("bo'sh array ham qabul qilinadi", async () => {
    mockAxios.post.mockResolvedValueOnce({ status: 204 });
    await assignKitchens('b-1', []);
    expect(mockAxios.post).toHaveBeenCalledWith(
      '/api/v1/super-admin/branches/b-1/assign-kitchens',
      { kitchen_ids: [] }
    );
  });
});
