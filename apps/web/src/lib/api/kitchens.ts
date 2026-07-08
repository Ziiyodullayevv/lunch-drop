import axiosInstance, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

export type KitchenRead = {
  id: string;
  name: string;
  description: string | null;
  phone: string | null;
  image_url: string | null;
  lat: number;
  lng: number;
  order_cutoff_time: string;
  delivery_start_time: string;
  delivery_end_time: string;
  is_active: boolean;
  created_at: string;
};

export type KitchenCreate = {
  name: string;
  lat: number;
  lng: number;
  description?: string | null;
  phone?: string | null;
  image_url?: string | null;
  order_cutoff_time?: string;
  delivery_start_time?: string;
  delivery_end_time?: string;
  is_active?: boolean;
};

export type KitchenUpdate = Partial<KitchenCreate>;

export type KitchenSettingsUpdate = {
  name?: string | null;
  description?: string | null;
  phone?: string | null;
  order_cutoff_time?: string | null;
  delivery_start_time?: string | null;
  delivery_end_time?: string | null;
  is_active?: boolean | null;
};

export type PageKitchen = {
  items: KitchenRead[];
  total: number;
  limit: number;
  offset: number;
};

// ----------------------------------------------------------------------

export function fetchKitchens(params?: { limit?: number; offset?: number }) {
  return fetcher<PageKitchen>([endpoints.superAdmin.kitchens, { params }]);
}

export function fetchKitchen(id: string) {
  return fetcher<KitchenRead>(endpoints.superAdmin.kitchen(id));
}

export function createKitchen(body: KitchenCreate) {
  return axiosInstance
    .post<KitchenRead>(endpoints.superAdmin.kitchens, body)
    .then((r) => r.data);
}

export function updateKitchen(id: string, body: KitchenUpdate) {
  return axiosInstance
    .patch<KitchenRead>(endpoints.superAdmin.kitchen(id), body)
    .then((r) => r.data);
}

export function deleteKitchen(id: string) {
  return axiosInstance.delete(endpoints.superAdmin.kitchen(id));
}

// Kitchen admin — o'z oshxonasi
export function fetchKitchenMe() {
  return fetcher<KitchenRead>(endpoints.kitchen.me);
}

export function updateKitchenSettings(body: KitchenSettingsUpdate) {
  return axiosInstance
    .patch<KitchenRead>(endpoints.kitchen.settings, body)
    .then((r) => r.data);
}

// ----------------------------------------------------------------------

export type PendingAdminRead = {
  id: string;
  full_name: string | null;
  phone: string;
  role: 'kitchen_admin' | 'company_admin';
  account_status: string | null;
  entity_name?: string | null;
  created_at: string;
};

export type UserRead = {
  id: string;
  phone: string;
  name: string | null;
  role: string;
  is_active: boolean;
  account_status: string | null;
  company_id: string | null;
  branch_id: string | null;
  kitchen_id: string | null;
};

export function fetchPendingAdmins() {
  return fetcher<PendingAdminRead[]>(endpoints.superAdmin.pendingAdmins);
}

export function approveAdmin(userId: string) {
  return axiosInstance
    .patch<UserRead>(endpoints.superAdmin.approveAdmin(userId))
    .then((r) => r.data);
}

export function rejectAdmin(userId: string) {
  return axiosInstance
    .patch<UserRead>(endpoints.superAdmin.rejectAdmin(userId))
    .then((r) => r.data);
}
