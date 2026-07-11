import type {
  AuthMeResponseDto,
  AuthResponseDto,
  AuthTokenDto,
  EmployeeStatusDto,
  OtpSendResponseDto,
} from '@/types/api';

import { apiClient, apiRequest, toJsonBody } from './client';
import { mapAuthSession, mapBranchInfo } from './mappers';
import type { AuthSession } from '@/types/domain';

export async function requestOtp(phone: string): Promise<{ phone: string; expiresIn: number; telegramUrl: string | null }> {
  const res = await apiRequest<OtpSendResponseDto>('/auth/send-otp', {
    method: 'POST',
    skipAuth: true,
    body: toJsonBody({ phone }),
  });
  return { phone, expiresIn: res.expires_in, telegramUrl: res.telegram_url ?? null };
}

export async function verifyOtp(phone: string, code: string): Promise<AuthSession> {
  const tokenRes = await apiRequest<AuthTokenDto>('/auth/employee-login', {
    method: 'POST',
    skipAuth: true,
    body: toJsonBody({ phone, code }),
  });

  const meRes = await apiClient.get<AuthMeResponseDto>('/auth/me', {
    headers: { Authorization: `Bearer ${tokenRes.access_token}` },
  });

  const dto: AuthResponseDto = {
    ...tokenRes,
    user: meRes.data.user,
  };

  const session = mapAuthSession(dto);

  try {
    const statusRes = await apiClient.get<EmployeeStatusDto>('/employee/status', {
      headers: { Authorization: `Bearer ${tokenRes.access_token}` },
    });
    const branches = (statusRes.data.branches ?? []).map(mapBranchInfo);
    const primaryBranch = branches[0];

    return {
      ...session,
      user: {
        ...session.user,
        accountStatus: statusRes.data.account_status ?? session.user.accountStatus,
        companyId: statusRes.data.company_id ?? session.user.companyId,
        branchId: primaryBranch?.id ?? session.user.branchId,
        branchName: primaryBranch?.name ?? session.user.branchName,
        branchAddress: primaryBranch?.address ?? session.user.branchAddress,
        branches,
      },
    };
  } catch {
    return session;
  }
}

export async function refreshTokens(
  refreshToken: string
): Promise<{ access_token: string; refresh_token: string }> {
  const res = await apiClient.post<{ access_token: string; refresh_token: string }>(
    '/auth/refresh-token',
    { refresh_token: refreshToken }
  );
  return res.data;
}

export async function logout(refreshToken?: string | null): Promise<void> {
  if (refreshToken) {
    await apiClient
      .post('/auth/logout', { refresh_token: refreshToken })
      .catch(() => {});
  }
}

export async function savePushToken(token: string): Promise<void> {
  await apiClient.patch('/auth/push-token', { push_token: token }).catch(() => {});
}

export async function getMe(): Promise<AuthMeResponseDto['user']> {
  const res = await apiClient.get<AuthMeResponseDto>('/auth/me');
  return res.data.user;
}
