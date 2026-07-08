import axiosInstance, { fetcher, endpoints } from 'src/lib/axios';

export type AccountRole = 'super_admin' | 'company_admin' | 'kitchen_admin' | 'employee';

export type AccountUser = {
  id: string;
  name?: string | null;
  phone: string;
  role: AccountRole;
  is_active?: boolean;
  account_status?: string;
  avatar_url?: string | null;
};

export type AccountProfile = {
  name: string;
  phone: string;
  role: AccountRole;
  isActive: boolean;
  accountStatus: string;
  avatarUrl: string | null;
};

export type AccountProfileUpdate = {
  name?: string;
  password?: string;
  avatar_url?: string;
};

type MeResponse = AccountUser | { user: AccountUser };

function unwrapUser(response: MeResponse): AccountUser {
  return 'user' in response ? response.user : response;
}

function toProfile(user: AccountUser): AccountProfile {
  return {
    name: user.name ?? '',
    phone: user.phone,
    role: user.role,
    isActive: user.is_active ?? true,
    accountStatus: user.account_status ?? 'approved',
    avatarUrl: user.avatar_url ?? null,
  };
}

export async function fetchAccountProfile(): Promise<AccountProfile> {
  const response = await fetcher<MeResponse>(endpoints.auth.me);
  return toProfile(unwrapUser(response));
}

export async function updateAccountProfile(
  profile: AccountProfileUpdate
): Promise<AccountProfile> {
  const { data } = await axiosInstance.patch<MeResponse>(endpoints.auth.me, profile);
  return toProfile(unwrapUser(data));
}
