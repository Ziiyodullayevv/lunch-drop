import type {
  OrderStatus,
  CompanyOrdersParams,
  SuperAdminOrdersParams,
} from 'src/lib/api/orders';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  placeOrder,
  cancelOrder,
  fetchKitchenMe,
  confirmDelivery,
  fetchOrderDetail,
  fetchOrderReport,
  fetchKitchenOrder,
  bulkConfirmOrders,
  updateOrderStatus,
  fetchEmployeeMenu,
  fetchCompanyOrders,
  fetchKitchenOrders,
  fetchEmployeeStatus,
  fetchSuperAdminOrder,
  fetchSuperAdminOrders,
  bulkConfirmBranchOrders,
} from 'src/lib/api/orders';

// ----------------------------------------------------------------------

export const orderKeys = {
  all:     ['orders'] as const,
  detail:  (id: string) => [...orderKeys.all, id] as const,
  kitchen: (params?: object) => [...orderKeys.all, 'kitchen', params] as const,
  company: (params?: object) => [...orderKeys.all, 'company', params] as const,
  superAdmin: (params?: object) => [...orderKeys.all, 'super-admin', params] as const,
};

export const kitchenKeys = {
  me: ['kitchen', 'me'] as const,
};

// ----------------------------------------------------------------------

export function useKitchenMe() {
  return useQuery({
    queryKey: kitchenKeys.me,
    queryFn:  fetchKitchenMe,
    staleTime: Infinity,
  });
}

export function useKitchenOrders(params?: { target_date?: string }) {
  return useQuery({
    queryKey: orderKeys.kitchen(params),
    queryFn:  () => fetchKitchenOrders(params),
  });
}

export function useKitchenOrder(id: string, enabled = true) {
  return useQuery({
    queryKey: [...orderKeys.kitchen(), 'detail', id],
    queryFn: () => fetchKitchenOrder(id),
    enabled: enabled && !!id,
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      updateOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

export function useBulkConfirm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bulkConfirmOrders,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

export function useBulkConfirmBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ branchId, targetDate }: { branchId: string; targetDate?: string }) =>
      bulkConfirmBranchOrders(branchId, targetDate),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orderKeys.all }),
  });
}

export function useOrderReport(periodStart: string, periodEnd: string, enabled = true) {
  return useQuery({
    queryKey: [...orderKeys.company(), 'report', periodStart, periodEnd],
    queryFn: () => fetchOrderReport(periodStart, periodEnd),
    enabled: enabled && !!periodStart && !!periodEnd,
  });
}

export function useCompanyOrders(params?: CompanyOrdersParams) {
  return useQuery({
    queryKey: orderKeys.company(params),
    queryFn:  () => fetchCompanyOrders(params),
  });
}

export function useSuperAdminOrders(params?: SuperAdminOrdersParams) {
  return useQuery({
    queryKey: orderKeys.superAdmin(params),
    queryFn:  () => fetchSuperAdminOrders(params),
  });
}

export function useSuperAdminOrder(id: string, enabled = true) {
  return useQuery({
    queryKey: [...orderKeys.superAdmin(), 'detail', id],
    queryFn: () => fetchSuperAdminOrder(id),
    enabled: enabled && !!id,
  });
}

export function useOrderDetail(id: string, enabled = true) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn:  () => fetchOrderDetail(id),
    enabled:  enabled && !!id,
  });
}

export function useConfirmDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => confirmDelivery(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelOrder(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

export function useEmployeeStatus(enabled = true) {
  return useQuery({
    queryKey: ['employee', 'status'],
    queryFn:  fetchEmployeeStatus,
    staleTime: 60_000,
    enabled,
  });
}

export function useEmployeeMenu(targetDate?: string) {
  return useQuery({
    queryKey: ['employee', 'menu', targetDate],
    queryFn:  () => fetchEmployeeMenu(targetDate),
  });
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: placeOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}
