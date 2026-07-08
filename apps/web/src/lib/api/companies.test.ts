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
      branchKitchens: (id: string) => `/api/v1/super-admin/branches/${id}/kitchens`,
      assignKitchens: (id: string) => `/api/v1/super-admin/branches/${id}/assign-kitchens`,
    },
    company: {
      kitchens:       '/api/v1/company/kitchens',
      branches:       '/api/v1/company/branches',
      branchKitchens: (id: string) => `/api/v1/company/branches/${id}/kitchens`,
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
  fetchCompanyKitchenCatalog,
  fetchBranchesWithKitchenIds,
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

const mockKitchen = {
  id: 'k-1', name: 'Osh markazi', description: null, phone: '+998901234567',
  is_active: true, order_cutoff_time: '10:30:00',
  delivery_start_time: '12:30:00', delivery_end_time: '13:00:00',
  created_at: '2024-01-01T00:00:00Z',
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

describe('fetchCompanyKitchenCatalog', () => {
  it("oshxonalarni ulangan filial ID'lari bilan qaytaradi", async () => {
    mockFetcher
      .mockResolvedValueOnce({ items: [mockKitchen], total: 1 })
      .mockResolvedValueOnce({ items: [mockBranch], total: 1 })
      .mockResolvedValueOnce([mockKitchen]);

    const result = await fetchCompanyKitchenCatalog();

    expect(result.branches).toEqual([mockBranch]);
    expect(result.kitchens[0].connected_branch_ids).toEqual(['b-1']);
    expect(mockFetcher).toHaveBeenNthCalledWith(3, '/api/v1/company/branches/b-1/kitchens');
  });

  it("ulanmagan oshxona uchun bo'sh filial ro'yxatini beradi", async () => {
    mockFetcher
      .mockResolvedValueOnce({ items: [mockKitchen], total: 1 })
      .mockResolvedValueOnce({ items: [mockBranch], total: 1 })
      .mockResolvedValueOnce([]);

    const result = await fetchCompanyKitchenCatalog();

    expect(result.kitchens[0].connected_branch_ids).toEqual([]);
  });

  it("faqat filial ro'yxatida kelgan oshxonani ham catalogda saqlaydi", async () => {
    const inactiveKitchen = { ...mockKitchen, id: 'k-2', is_active: false };
    mockFetcher
      .mockResolvedValueOnce({ items: [mockKitchen], total: 1 })
      .mockResolvedValueOnce({ items: [mockBranch], total: 1 })
      .mockResolvedValueOnce([inactiveKitchen]);

    const result = await fetchCompanyKitchenCatalog();

    expect(result.kitchens).toHaveLength(2);
    expect(result.kitchens.find((kitchen) => kitchen.id === 'k-2')?.connected_branch_ids)
      .toEqual(['b-1']);
  });
});

describe('fetchBranchesWithKitchenIds', () => {
  it("branch detaildan kitchen_ids olib listga qo'shadi", async () => {
    mockFetcher
      .mockResolvedValueOnce({ items: [mockBranch], total: 1, limit: 100, offset: 0 })
      .mockResolvedValueOnce({ ...mockBranch, kitchen_ids: ['k-1', 'k-2'] });

    const result = await fetchBranchesWithKitchenIds({ limit: 100 });

    expect(result.items[0].kitchen_ids).toEqual(['k-1', 'k-2']);
    expect(mockFetcher).toHaveBeenNthCalledWith(1, [
      '/api/v1/super-admin/branches',
      { params: { limit: 100 } },
    ]);
    expect(mockFetcher).toHaveBeenNthCalledWith(2, '/api/v1/super-admin/branches/b-1');
  });

  it("detailda kitchen_ids bo'lmasa branch kitchens endpointidan olib keladi", async () => {
    mockFetcher
      .mockResolvedValueOnce({ items: [mockBranch], total: 1, limit: 100, offset: 0 })
      .mockResolvedValueOnce(mockBranch);
    mockAxios.get.mockResolvedValueOnce({ data: [{ id: 'k-1' }, { id: 'k-2' }] });

    const result = await fetchBranchesWithKitchenIds({ limit: 100 });

    expect(result.items[0].kitchen_ids).toEqual(['k-1', 'k-2']);
    expect(mockAxios.get).toHaveBeenCalledWith('/api/v1/super-admin/branches/b-1/kitchens');
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
  it("kitchen_ids bilan post qiladi va qaytgan oshxonalarni beradi", async () => {
    mockAxios.post.mockResolvedValueOnce({ data: [mockKitchen] });
    const res = await assignKitchens('b-1', ['k-1', 'k-2']);
    expect(res).toEqual([mockKitchen]);
    expect(mockAxios.post).toHaveBeenCalledWith(
      '/api/v1/super-admin/branches/b-1/assign-kitchens',
      { kitchen_ids: ['k-1', 'k-2'] }
    );
  });

  it("bo'sh array ham qabul qilinadi", async () => {
    mockAxios.post.mockResolvedValueOnce({ data: [] });
    const res = await assignKitchens('b-1', []);
    expect(res).toEqual([]);
    expect(mockAxios.post).toHaveBeenCalledWith(
      '/api/v1/super-admin/branches/b-1/assign-kitchens',
      { kitchen_ids: [] }
    );
  });
});
