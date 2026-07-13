import type { BranchCreate, BranchUpdate, CompanyBranchCreate } from 'src/lib/api/companies';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  fetchBranch,
  createBranch,
  deleteBranch,
  updateBranch,
  assignKitchens,
  fetchCompanyBranch,
  createCompanyBranch,
  deleteCompanyBranch,
  updateCompanyBranch,
  fetchCompanyKitchens,
  fetchCompanyBranchesList,
  fetchCompanyBranchKitchens,
  fetchBranchesWithKitchenIds,
  assignCompanyBranchKitchens,
} from 'src/lib/api/companies';

// ----------------------------------------------------------------------

export const branchKeys = {
  all:         ['branches'] as const,
  list:        (params?: object) => [...branchKeys.all, 'list', params] as const,
  companyList: (params?: object) => [...branchKeys.all, 'company-list', params] as const,
  detail:      (id: string)     => [...branchKeys.all, 'detail', id] as const,
};

// ------------------ super_admin ------------------

export function useBranches(
  params?: { limit?: number; offset?: number; company_id?: string },
  enabled = true
) {
  return useQuery({
    queryKey: branchKeys.list(params),
    queryFn:  () => fetchBranchesWithKitchenIds(params),
    enabled,
  });
}

export function useBranch(id: string, enabled = true) {
  return useQuery({
    queryKey: branchKeys.detail(id),
    queryFn:  () => fetchBranch(id),
    enabled:  enabled && !!id,
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: BranchCreate) => createBranch(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: branchKeys.all });
    },
  });
}

export function useUpdateBranch(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: BranchUpdate) => updateBranch(id, body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: branchKeys.all });
      queryClient.setQueryData(branchKeys.detail(id), data);
    },
  });
}

export function useDeleteBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBranch(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: branchKeys.all });
      queryClient.removeQueries({ queryKey: branchKeys.detail(id) });
    },
  });
}

export function useAssignKitchens(branchId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (kitchen_ids: string[]) => assignKitchens(branchId, kitchen_ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: branchKeys.detail(branchId) });
    },
  });
}

// ------------------ company_admin ------------------

export function useCompanyBranches(
  params?: { limit?: number; offset?: number },
  enabled = true
) {
  return useQuery({
    queryKey: branchKeys.companyList(params),
    queryFn:  () => fetchCompanyBranchesList(params),
    enabled,
  });
}

export function useCompanyBranch(id: string, enabled = true) {
  return useQuery({
    queryKey: branchKeys.detail(id),
    queryFn:  () => fetchCompanyBranch(id),
    enabled:  enabled && !!id,
  });
}

export function useCreateCompanyBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CompanyBranchCreate) => createCompanyBranch(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: branchKeys.all });
    },
  });
}

export function useUpdateCompanyBranch(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: BranchUpdate) => updateCompanyBranch(id, body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: branchKeys.all });
      queryClient.setQueryData(branchKeys.detail(id), data);
    },
  });
}

export function useDeleteCompanyBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCompanyBranch(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: branchKeys.all });
      queryClient.removeQueries({ queryKey: branchKeys.detail(id) });
    },
  });
}

export function useCompanyKitchens(enabled = true) {
  return useQuery({
    queryKey: ['company-kitchens'],
    queryFn:  () => fetchCompanyKitchens(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCompanyBranchKitchens(branchId: string, enabled = true) {
  return useQuery({
    queryKey: ['company-branch-kitchens', branchId],
    queryFn:  () => fetchCompanyBranchKitchens(branchId),
    enabled:  enabled && !!branchId,
  });
}

export function useAssignCompanyKitchens(branchId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (kitchen_ids: string[]) => assignCompanyBranchKitchens(branchId, kitchen_ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-branch-kitchens', branchId] });
      queryClient.invalidateQueries({ queryKey: branchKeys.all });
    },
  });
}
