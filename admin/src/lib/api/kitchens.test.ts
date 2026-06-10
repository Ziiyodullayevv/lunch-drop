import { it, vi, expect, describe, beforeEach } from 'vitest';

vi.mock('src/lib/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  fetcher: vi.fn(),
  endpoints: {
    superAdmin: {
      kitchens:     '/api/v1/super-admin/kitchens',
      kitchen:      (id: string) => `/api/v1/super-admin/kitchens/${id}`,
      pendingAdmins: '/api/v1/super-admin/pending-admins',
      approveAdmin: (id: string) => `/api/v1/super-admin/admins/${id}/approve`,
      rejectAdmin:  (id: string) => `/api/v1/super-admin/admins/${id}/reject`,
    },
  },
}));

import axiosInstance, { fetcher } from 'src/lib/axios';

import {
  rejectAdmin, approveAdmin, fetchKitchen,
  createKitchen, deleteKitchen, fetchKitchens, updateKitchen, fetchPendingAdmins,
} from './kitchens';

const mockAxios   = vi.mocked(axiosInstance);
const mockFetcher = vi.mocked(fetcher);

const mockKitchen = {
  id: 'k-1', name: "Ali's Kitchen", description: null, phone: null,
  lat: 41.2995, lng: 69.2401,
  order_cutoff_time: '10:30:00', delivery_start_time: '12:30:00', delivery_end_time: '13:00:00',
  is_active: true, created_at: '2024-01-01T00:00:00Z',
};

const mockUser = {
  id: 'u-1', phone: '+998901234567', name: 'Ali Valiyev', role: 'kitchen_admin',
  is_active: true, account_status: 'approved', company_id: null, branch_id: null, kitchen_id: 'k-1',
};

beforeEach(() => vi.clearAllMocks());

// ----------------------------------------------------------------------

describe('fetchKitchens', () => {
  it("oshxonalar ro'yxatini qaytaradi", async () => {
    mockFetcher.mockResolvedValueOnce({ items: [mockKitchen], total: 1, limit: 20, offset: 0 });
    const result = await fetchKitchens();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('k-1');
  });

  it("bo'sh ro'yxat qaytarishi mumkin", async () => {
    mockFetcher.mockResolvedValueOnce({ items: [], total: 0, limit: 20, offset: 0 });
    expect((await fetchKitchens()).items).toHaveLength(0);
  });
});

describe('fetchKitchen', () => {
  it("bitta oshxonani qaytaradi", async () => {
    mockFetcher.mockResolvedValueOnce(mockKitchen);
    const result = await fetchKitchen('k-1');
    expect(result.id).toBe('k-1');
    expect(result.order_cutoff_time).toBe('10:30:00');
    expect(result.is_active).toBe(true);
  });
});

describe('createKitchen', () => {
  it("yangi oshxona yaratadi", async () => {
    mockAxios.post.mockResolvedValueOnce({ data: mockKitchen });
    const result = await createKitchen({ name: "Ali's Kitchen", lat: 41.2995, lng: 69.2401 });
    expect(result.id).toBe('k-1');
    expect(mockAxios.post).toHaveBeenCalledWith(
      '/api/v1/super-admin/kitchens',
      expect.objectContaining({ name: "Ali's Kitchen" })
    );
  });
});

describe('updateKitchen', () => {
  it("oshxonani yangilaydi", async () => {
    mockAxios.patch.mockResolvedValueOnce({ data: { ...mockKitchen, name: 'Yangi nom' } });
    const result = await updateKitchen('k-1', { name: 'Yangi nom' });
    expect(result.name).toBe('Yangi nom');
  });

  it("is_active o'zgartiriladi", async () => {
    mockAxios.patch.mockResolvedValueOnce({ data: { ...mockKitchen, is_active: false } });
    const result = await updateKitchen('k-1', { is_active: false });
    expect(result.is_active).toBe(false);
  });
});

describe('deleteKitchen', () => {
  it("delete endpointga murojaat qiladi", async () => {
    mockAxios.delete.mockResolvedValueOnce({ status: 204 });
    const res = await deleteKitchen('k-1');
    expect(res.status).toBe(204);
    expect(mockAxios.delete).toHaveBeenCalledWith('/api/v1/super-admin/kitchens/k-1');
  });
});

// ----------------------------------------------------------------------

describe('fetchPendingAdmins', () => {
  it("pending adminlar ro'yxatini qaytaradi", async () => {
    const pending = [{ id: 'u-1', full_name: 'Ali', phone: '+998901234567', role: 'kitchen_admin' as const, account_status: 'pending_approval', created_at: '2024-01-01T00:00:00Z' }];
    mockFetcher.mockResolvedValueOnce(pending);
    const result = await fetchPendingAdmins();
    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('kitchen_admin');
  });

  it("bo'sh array qaytarishi mumkin", async () => {
    mockFetcher.mockResolvedValueOnce([]);
    expect(await fetchPendingAdmins()).toHaveLength(0);
  });
});

describe('approveAdmin', () => {
  it("adminni tasdiqlaydi", async () => {
    mockAxios.patch.mockResolvedValueOnce({ data: mockUser });
    const result = await approveAdmin('u-1');
    expect(result.account_status).toBe('approved');
    expect(mockAxios.patch).toHaveBeenCalledWith('/api/v1/super-admin/admins/u-1/approve');
  });
});

describe('rejectAdmin', () => {
  it("adminni rad etadi", async () => {
    mockAxios.patch.mockResolvedValueOnce({ data: { ...mockUser, account_status: 'rejected' } });
    const result = await rejectAdmin('u-1');
    expect(result.account_status).toBe('rejected');
    expect(mockAxios.patch).toHaveBeenCalledWith('/api/v1/super-admin/admins/u-1/reject');
  });
});
