import { it, vi, expect, describe, beforeEach } from 'vitest';

vi.mock('src/lib/axios', () => ({
  default: { patch: vi.fn() },
  fetcher: vi.fn(),
  endpoints: {
    auth: {
      me: '/api/v1/auth/me',
    },
  },
}));

import axiosInstance, { fetcher } from 'src/lib/axios';

import { fetchAccountProfile, updateAccountProfile } from './account';

const mockAxios = vi.mocked(axiosInstance);
const mockFetcher = vi.mocked(fetcher);

beforeEach(() => vi.clearAllMocks());

describe('fetchAccountProfile', () => {
  it('auth/me wrapper javobidan account profilini oladi', async () => {
    mockFetcher.mockResolvedValueOnce({
      user: {
        id: 'u-1',
        name: 'Ali Valiyev',
        phone: '+998901234567',
        role: 'company_admin',
        avatar_url: '/uploads/avatars/ali.jpg',
      },
    });

    await expect(fetchAccountProfile()).resolves.toEqual({
      name: 'Ali Valiyev',
      phone: '+998901234567',
      role: 'company_admin',
      isActive: true,
      accountStatus: 'approved',
      avatarUrl: '/uploads/avatars/ali.jpg',
    });
    expect(mockFetcher).toHaveBeenCalledWith('/api/v1/auth/me');
  });
});

describe('updateAccountProfile', () => {
  it.each(['super_admin', 'company_admin', 'kitchen_admin', 'employee'] as const)(
    '%s profilini auth/me orqali yangilaydi',
    async (role) => {
      mockAxios.patch.mockResolvedValueOnce({
        data: {
          user: {
            id: 'u-1',
            name: 'Yangi ism',
            phone: '+998901111111',
            role,
            is_active: true,
            account_status: 'approved',
            avatar_url: null,
          },
        },
      });

      const profile = await updateAccountProfile({
        name: 'Yangi ism',
      });

      expect(mockAxios.patch).toHaveBeenCalledWith('/api/v1/auth/me', {
        name: 'Yangi ism',
      });
      expect(profile).toEqual({
        name: 'Yangi ism',
        phone: '+998901111111',
        role,
        isActive: true,
        accountStatus: 'approved',
        avatarUrl: null,
      });
    }
  );

  it('wrapper ishlatilmagan user javobini ham qabul qiladi', async () => {
    mockAxios.patch.mockResolvedValueOnce({
      data: {
        id: 'u-2',
        name: 'Admin',
        phone: '+998909999999',
        role: 'super_admin',
        is_active: true,
        account_status: 'approved',
        avatar_url: '/uploads/avatars/admin.jpg',
      },
    });

    await expect(
      updateAccountProfile({ password: 'yangi-parol' })
    ).resolves.toEqual({
      name: 'Admin',
      phone: '+998909999999',
      role: 'super_admin',
      isActive: true,
      accountStatus: 'approved',
      avatarUrl: '/uploads/avatars/admin.jpg',
    });

    expect(mockAxios.patch).toHaveBeenCalledWith('/api/v1/auth/me', {
      password: 'yangi-parol',
    });
  });

  it('avatar URL ni auth/me ga string sifatida yuboradi', async () => {
    mockAxios.patch.mockResolvedValueOnce({
      data: {
        user: {
          id: 'u-3',
          name: 'Admin',
          phone: '+998901234567',
          role: 'super_admin',
          avatar_url: '/uploads/avatars/avatar.jpg',
        },
      },
    });

    await updateAccountProfile({ avatar_url: '/uploads/avatars/avatar.jpg' });

    expect(mockAxios.patch).toHaveBeenCalledWith('/api/v1/auth/me', {
      avatar_url: '/uploads/avatars/avatar.jpg',
    });
  });
});
