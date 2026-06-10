import type { AccountStatus } from 'src/lib/api/orders';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchCompanyEmployees,
  fetchPendingEmployees,
  updateEmployeeStatus,
} from 'src/lib/api/orders';

// ----------------------------------------------------------------------

export const employeeKeys = {
  all:     ['employees'] as const,
  list:    (params?: object) => ['employees', 'list', params] as const,
  pending: ['employees', 'pending'] as const,
};

// ----------------------------------------------------------------------

export function useCompanyEmployees(params?: {
  account_status?: AccountStatus;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: employeeKeys.list(params),
    queryFn:  () => fetchCompanyEmployees(params),
  });
}

export function usePendingEmployees() {
  return useQuery({
    queryKey: employeeKeys.pending,
    queryFn:  fetchPendingEmployees,
  });
}

export function useUpdateEmployeeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AccountStatus }) =>
      updateEmployeeStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
    },
  });
}
