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

export type SettlementStatus = 'pending' | 'partial' | 'paid' | 'overdue';

export type SettlementPayment = {
  id: string;
  company_id: string;
  period_month: string;
  amount: string;
  paid_at: string;
  payment_method: string | null;
  transaction_reference: string | null;
  note: string | null;
  receipt_url: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
};

export type SettlementBranch = {
  branch_id: string;
  branch_name: string;
  orders_count: number;
  gross_amount: string;
  system_fee: string;
  kitchen_receivable: string;
};

export type KitchenSettlement = {
  company_id: string;
  company_name: string;
  billing_day: number;
  orders_count: number;
  gross_amount: string;
  system_fee: string;
  kitchen_receivable: string;
  paid_amount: string;
  balance_amount: string;
  status: SettlementStatus;
  branches: SettlementBranch[];
  payments: SettlementPayment[];
};

export type KitchenSettlementReport = {
  rows: KitchenSettlement[];
  paymentActionsAvailable: boolean;
};

export type SettlementPaymentInput = {
  company_id: string;
  period_month: string;
  amount: number;
  paid_at: string;
  payment_method?: string | null;
  transaction_reference?: string | null;
  note?: string | null;
  receipt_url?: string | null;
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

export function fetchKitchenSettlements(month: string) {
  return fetcher<KitchenSettlement[]>([endpoints.kitchen.settlements, { params: { month } }])
    .then((rows) => ({ rows, paymentActionsAvailable: true }))
    .catch(async (error: Error & { status?: number }) => {
      if (error.status !== 404) throw error;

      const partners = await fetchKitchenPartners(month);
      const today = new Date();
      const [year, currentMonth] = month.split('-').map(Number);
      const isPastPeriod = year < today.getFullYear() || (year === today.getFullYear() && currentMonth < today.getMonth() + 1);

      const byCompany = new Map<string, KitchenSettlement>();
      partners.forEach((partner) => {
        const existing = byCompany.get(partner.company_id);
        const gross = Number(partner.gross_amount);
        const fee = Number(partner.system_fee);
        const receivable = Number(partner.kitchen_receivable);
        const overdue = isPastPeriod || (year === today.getFullYear() && currentMonth === today.getMonth() + 1 && today.getDate() > partner.billing_day);
        const branch = {
          branch_id: partner.branch_id,
          branch_name: partner.branch_name,
          orders_count: partner.orders_count,
          gross_amount: partner.gross_amount,
          system_fee: partner.system_fee,
          kitchen_receivable: partner.kitchen_receivable,
        };
        if (existing) {
          existing.orders_count += partner.orders_count;
          existing.gross_amount = String(Number(existing.gross_amount) + gross);
          existing.system_fee = String(Number(existing.system_fee) + fee);
          existing.kitchen_receivable = String(Number(existing.kitchen_receivable) + receivable);
          existing.balance_amount = existing.kitchen_receivable;
          existing.branches.push(branch);
          return;
        }
        byCompany.set(partner.company_id, {
          company_id: partner.company_id,
          company_name: partner.company_name,
          billing_day: partner.billing_day,
          orders_count: partner.orders_count,
          gross_amount: partner.gross_amount,
          system_fee: partner.system_fee,
          kitchen_receivable: partner.kitchen_receivable,
          paid_amount: '0',
          balance_amount: partner.kitchen_receivable,
          status: overdue ? 'overdue' : 'pending',
          branches: [branch],
          payments: [],
        });
      });
      return { rows: [...byCompany.values()], paymentActionsAvailable: false };
    });
}

export function createSettlementPayment(payload: SettlementPaymentInput) {
  return axiosInstance.post<SettlementPayment>(endpoints.kitchen.settlementPayments, payload).then((response) => response.data);
}

export function updateSettlementPayment(id: string, payload: Omit<SettlementPaymentInput, 'company_id' | 'period_month'>) {
  return axiosInstance.patch<SettlementPayment>(endpoints.kitchen.settlementPayment(id), payload).then((response) => response.data);
}

export function deleteSettlementPayment(id: string) {
  return axiosInstance.delete(endpoints.kitchen.settlementPayment(id));
}

export function uploadSettlementReceipt(id: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  return axiosInstance.post<SettlementPayment>(endpoints.kitchen.settlementReceipt(id), form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((response) => response.data);
}
