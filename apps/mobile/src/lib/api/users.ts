import type { AuthMeResponseDto, AuthUserDto } from '@/types/api';
import type { CurrentUser } from '@/types/domain';

import { apiClient, toJsonBody } from './client';
import { mapUser } from './mappers';

export async function getEmployeeProfile(): Promise<CurrentUser> {
  const res = await apiClient.get<AuthUserDto>('/employee/me');
  return mapUser(res.data);
}

export async function updateMe(data: {
  name?: string;
  password?: string;
  avatar_url?: string;
}): Promise<CurrentUser> {
  const res = await apiClient.patch<AuthMeResponseDto>('/auth/me', toJsonBody(data));
  return mapUser(res.data.user);
}
