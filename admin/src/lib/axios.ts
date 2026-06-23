import type { AxiosRequestConfig } from 'axios';

import axios from 'axios';


// ----------------------------------------------------------------------

const axiosInstance = axios.create({
  baseURL: '/admin-api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ----------------------------------------------------------------------
// Attach access token to every request
axiosInstance.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('jwt_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ----------------------------------------------------------------------
// 401 → try refresh → retry; otherwise reject with readable message
let _isRefreshing = false;
let _failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];
const PUBLIC_AUTH_ENDPOINTS = [
  '/auth/admin-login',
  '/auth/send-otp',
  '/auth/verify-otp',
  '/auth/admin-register',
];

function processQueue(error: unknown, token: string | null) {
  _failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  _failedQueue = [];
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Only attempt refresh on 401, and not for the refresh endpoint itself
    if (
      error?.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh-token') &&
      !PUBLIC_AUTH_ENDPOINTS.some((endpoint) => originalRequest.url?.includes(endpoint))
    ) {
      if (_isRefreshing) {
        // Queue this request until refresh completes
        return new Promise<string>((resolve, reject) => {
          _failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers = {
              ...originalRequest.headers,
              Authorization: `Bearer ${token}`,
            };
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      _isRefreshing = true;

      const refreshToken = sessionStorage.getItem('jwt_refresh_token');

      if (!refreshToken) {
        _isRefreshing = false;
        processQueue(error, null);
        sessionStorage.removeItem('jwt_access_token');
        window.location.href = '/auth/jwt/sign-in';
        return Promise.reject(error);
      }

      try {
        const res = await axiosInstance.post('/api/v1/auth/refresh-token', {
          refresh_token: refreshToken,
        });
        const { access_token, refresh_token: newRefresh } = res.data as {
          access_token: string;
          refresh_token?: string;
        };

        sessionStorage.setItem('jwt_access_token', access_token);
        if (newRefresh) sessionStorage.setItem('jwt_refresh_token', newRefresh);
        axiosInstance.defaults.headers.common.Authorization = `Bearer ${access_token}`;

        processQueue(null, access_token);

        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${access_token}`,
        };
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        sessionStorage.removeItem('jwt_access_token');
        sessionStorage.removeItem('jwt_refresh_token');
        delete axiosInstance.defaults.headers.common.Authorization;
        window.location.href = '/auth/jwt/sign-in';
        return Promise.reject(refreshError);
      } finally {
        _isRefreshing = false;
      }
    }

    const rawDetail = error?.response?.data?.detail;
    const detail = Array.isArray(rawDetail)
      ? rawDetail.map((d: { msg?: string }) => d.msg ?? JSON.stringify(d)).join(', ')
      : rawDetail;

    const message: string =
      error?.response?.data?.error?.message ||
      detail ||
      error?.response?.data?.message ||
      error?.message ||
      'Something went wrong!';

    const err = new Error(message);
    // Preserve HTTP status so callers can inspect it
    (err as any).status = error?.response?.status;
    return Promise.reject(err);
  }
);

export default axiosInstance;

// ----------------------------------------------------------------------

export const fetcher = async <T = unknown>(
  args: string | [string, AxiosRequestConfig]
): Promise<T> => {
  try {
    const [url, config] = Array.isArray(args) ? args : [args, {}];

    const res = await axiosInstance.get<T>(url, config);

    return res.data;
  } catch (error) {
    console.error('Fetcher failed:', error);
    throw error;
  }
};

// ----------------------------------------------------------------------

export const endpoints = {
  // ----------------------------------------------------------------------
  // Auth
  auth: {
    adminLogin:    '/api/v1/auth/admin-login',
    sendOtp:       '/api/v1/auth/send-otp',
    verifyOtp:     '/api/v1/auth/verify-otp',
    adminRegister: '/api/v1/auth/admin-register',
    refreshToken:  '/api/v1/auth/refresh-token',
    logout:        '/api/v1/auth/logout',
    me:            '/api/v1/auth/me',
  },
  // ----------------------------------------------------------------------
  // Super Admin
  superAdmin: {
    dashboard:      '/api/v1/super-admin/dashboard',
    companies:      '/api/v1/super-admin/companies',
    company:        (id: string) => `/api/v1/super-admin/companies/${id}`,
    kitchens:       '/api/v1/super-admin/kitchens',
    kitchen:        (id: string) => `/api/v1/super-admin/kitchens/${id}`,
    branches:       '/api/v1/super-admin/branches',
    branch:         (id: string) => `/api/v1/super-admin/branches/${id}`,
    branchKitchens: (id: string) => `/api/v1/super-admin/branches/${id}/kitchens`,
    assignKitchens: (id: string) => `/api/v1/super-admin/branches/${id}/assign-kitchens`,
    pendingAdmins:  '/api/v1/super-admin/pending-admins',
    approveAdmin:   (id: string) => `/api/v1/super-admin/admins/${id}/approve`,
    rejectAdmin:    (id: string) => `/api/v1/super-admin/admins/${id}/reject`,
    users:          '/api/v1/super-admin/users',
    user:           (id: string) => `/api/v1/super-admin/users/${id}`,
    blockUser:      (id: string) => `/api/v1/super-admin/users/${id}/block`,
    orders:         '/api/v1/super-admin/orders',
    order:          (id: string) => `/api/v1/super-admin/orders/${id}`,
  },
  // ----------------------------------------------------------------------
  // Kitchen Admin
  kitchen: {
    dashboard:    '/api/v1/kitchen/dashboard',
    me:           '/api/v1/kitchen/me',
    settings:     '/api/v1/kitchen/settings',
    categories:   '/api/v1/kitchen/categories',
    meals:        '/api/v1/kitchen/meals',
    meal:         (id: string) => `/api/v1/kitchen/meals/${id}`,
    mealImage:    (id: string) => `/api/v1/kitchen/meals/${id}/image`,
    scheduleMenu: '/api/v1/kitchen/schedule-menu',
    schedules:    '/api/v1/kitchen/schedules',
    schedule:     (id: string) => `/api/v1/kitchen/schedules/${id}`,
    orders:       '/api/v1/kitchen/orders',
    order:        (id: string) => `/api/v1/kitchen/orders/${id}`,
    orderStatus:  (id: string) => `/api/v1/kitchen/orders/${id}/status`,
  },
  // ----------------------------------------------------------------------
  // Company Admin
  company: {
    dashboard:        '/api/v1/company/dashboard',
    me:               '/api/v1/company/me',
    employees:        '/api/v1/company/employees',
    pendingEmployees: '/api/v1/company/employees/pending',
    employeeStatus:   (id: string) => `/api/v1/company/employees/${id}/status`,
    orders:           '/api/v1/company/orders',
    bulkConfirm:      '/api/v1/company/orders/bulk-confirm',
    invoices:         '/api/v1/company/invoices',
    branches:         '/api/v1/company/branches',
    branch:           (id: string) => `/api/v1/company/branches/${id}`,
    branchKitchens:   (id: string) => `/api/v1/company/branches/${id}/kitchens`,
    assignKitchens:   (id: string) => `/api/v1/company/branches/${id}/assign-kitchens`,
    kitchens:         '/api/v1/company/kitchens',
  },
  // ----------------------------------------------------------------------
  // Employee / Orders
  employee: {
    companies:  '/api/v1/employee/companies',
    joinBranch: '/api/v1/employee/join-branch',
    status:     '/api/v1/employee/status',
    menu:       '/api/v1/employee/menu',
  },
  orders: {
    list:            '/api/v1/orders',
    create:          '/api/v1/orders',
    detail:          (id: string) => `/api/v1/orders/${id}`,
    confirmDelivery: (id: string) => `/api/v1/orders/${id}/confirm-delivery`,
    cancel:          (id: string) => `/api/v1/orders/${id}/cancel`,
  },
  uploads: {
    image: '/api/v1/uploads/image',
  },
  // ----------------------------------------------------------------------
  // Template legacy — foydalanilmaydi
  chat:    '/api/chat',
  kanban:  '/api/kanban',
  calendar:'/api/calendar',
  mail: {
    list:   '/api/mail/list',
    details:'/api/mail/details',
    labels: '/api/mail/labels',
  },
  post: {
    list:   '/api/post/list',
    details:'/api/post/details',
    latest: '/api/post/latest',
    search: '/api/post/search',
  },
  product: {
    list:   '/api/product/list',
    details:'/api/product/details',
    search: '/api/product/search',
  },
} as const;
