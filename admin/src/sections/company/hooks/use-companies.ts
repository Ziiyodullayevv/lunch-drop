import type { CompanyCreate, CompanyUpdate } from 'src/lib/api/companies';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  fetchCompany,
  createCompany,
  deleteCompany,
  updateCompany,
  fetchCompanies,
} from 'src/lib/api/companies';

// ----------------------------------------------------------------------

export const companyKeys = {
  all:    ['companies'] as const,
  list:   (params?: object) => [...companyKeys.all, 'list', params] as const,
  detail: (id: string)     => [...companyKeys.all, 'detail', id] as const,
};

// ----------------------------------------------------------------------

export function useCompanies(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: companyKeys.list(params),
    queryFn:  () => fetchCompanies(params),
  });
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: companyKeys.detail(id),
    queryFn:  () => fetchCompany(id),
    enabled:  !!id,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CompanyCreate) => createCompany(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.all });
    },
  });
}

export function useUpdateCompany(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CompanyUpdate) => updateCompany(id, body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: companyKeys.all });
      queryClient.setQueryData(companyKeys.detail(id), data);
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCompany(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: companyKeys.all });
      queryClient.removeQueries({ queryKey: companyKeys.detail(id) });
    },
  });
}
