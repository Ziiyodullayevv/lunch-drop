import axios from 'axios';

import { appConfig } from '@/constants/config';
import { useAuthStore } from '@/stores/auth-store';

// ----------------------------------------------------------------------

console.log('[API] baseURL:', appConfig.apiUrl);

export const apiClient = axios.create({
  baseURL: appConfig.apiUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// Attach access token from store on every request
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ----------------------------------------------------------------------
// 401 → try refresh → retry queued requests
let _isRefreshing = false;
let _queue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
  _queue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  _queue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as typeof error.config & { _retry?: boolean };

    if (
      error?.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/refresh-token') &&
      !original.url?.includes('/auth/employee-login')
    ) {
      if (_isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          _queue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return apiClient(original);
        });
      }

      original._retry = true;
      _isRefreshing = true;

      const { refreshToken, user, setSession, clearSession } = useAuthStore.getState();

      if (!refreshToken) {
        _isRefreshing = false;
        processQueue(error, null);
        clearSession();
        return Promise.reject(error);
      }

      try {
        const res = await apiClient.post<{ access_token: string; refresh_token?: string }>(
          '/auth/refresh-token',
          { refresh_token: refreshToken }
        );
        const { access_token, refresh_token: newRefresh } = res.data;

        setSession({
          accessToken: access_token,
          refreshToken: newRefresh ?? refreshToken,
          user: user!,
        });

        apiClient.defaults.headers.common.Authorization = `Bearer ${access_token}`;
        processQueue(null, access_token);
        original.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearSession();
        return Promise.reject(refreshError);
      } finally {
        _isRefreshing = false;
      }
    }

    const code: string | undefined = error?.response?.data?.error?.code;

    // FastAPI validation errors (422) return detail as an array of {loc, msg, type}
    const rawDetail = error?.response?.data?.detail;
    const detail = Array.isArray(rawDetail)
      ? rawDetail.map((d: { msg?: string }) => d.msg ?? 'Xatolik').join(', ')
      : typeof rawDetail === 'string'
      ? rawDetail
      : null;

    const message: string =
      error?.response?.data?.error?.message ||
      detail ||
      error?.response?.data?.message ||
      (typeof error?.message === 'string' ? error.message : null) ||
      'Xatolik yuz berdi';

    const err = new Error(message) as Error & { code?: string };
    err.code = code;
    return Promise.reject(err);
  }
);

// ----------------------------------------------------------------------
// Generic request wrapper — same call signature as before
export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; skipAuth?: boolean } = {}
): Promise<T> {
  const res = await apiClient.request<T>({
    url: path,
    method: (options.method ?? 'GET') as 'get' | 'post' | 'put' | 'patch' | 'delete',
    data: options.body,
    headers: options.skipAuth ? { Authorization: '' } : undefined,
  });
  return res.data;
}

export function toJsonBody(input: unknown) {
  return input;
}
