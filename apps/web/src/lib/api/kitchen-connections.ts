import type { KitchenConnectionRead } from './companies';

import axiosInstance, { fetcher, endpoints } from 'src/lib/axios';

export type KitchenPartnerReport = {
  company_id: string;
  company_name: string;
  branch_id: string;
  branch_name: string;
  billing_day: number;
  orders_count: number;
  gross_amount: string;
  system_fee: string;
  kitchen_receivable: string;
};

export function fetchKitchenConnectionRequests() {
  return fetcher<KitchenConnectionRead[]>(endpoints.kitchen.connectionRequests);
}

export function approveKitchenConnection(id: string) {
  return axiosInstance
    .patch<KitchenConnectionRead>(endpoints.kitchen.approveConnection(id))
    .then((response) => response.data);
}

export function rejectKitchenConnection(id: string) {
  return axiosInstance
    .patch<KitchenConnectionRead>(endpoints.kitchen.rejectConnection(id))
    .then((response) => response.data);
}

export function fetchKitchenPartners(month: string) {
  return fetcher<KitchenPartnerReport[]>([endpoints.kitchen.partners, { params: { month } }]);
}
