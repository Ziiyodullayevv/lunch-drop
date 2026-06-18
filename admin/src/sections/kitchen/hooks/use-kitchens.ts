import type { KitchenCreate, KitchenUpdate, KitchenSettingsUpdate } from 'src/lib/api/kitchens';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  rejectAdmin,
  approveAdmin,
  fetchKitchen,
  createKitchen,
  deleteKitchen,
  fetchKitchens,
  updateKitchen,
  fetchKitchenMe,
  fetchPendingAdmins,
  updateKitchenSettings,
} from 'src/lib/api/kitchens';

// ----------------------------------------------------------------------

export const kitchenKeys = {
  all:          ['kitchens'] as const,
  list:         (params?: object) => [...kitchenKeys.all, 'list', params] as const,
  detail:       (id: string)     => [...kitchenKeys.all, 'detail', id] as const,
  pendingAdmins: ['pending-admins'] as const,
};

// ----------------------------------------------------------------------

export function useKitchens(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: kitchenKeys.list(params),
    queryFn:  () => fetchKitchens(params),
  });
}

export function useKitchen(id: string) {
  return useQuery({
    queryKey: kitchenKeys.detail(id),
    queryFn:  () => fetchKitchen(id),
    enabled:  !!id,
  });
}

export function useCreateKitchen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: KitchenCreate) => createKitchen(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kitchenKeys.all });
    },
  });
}

export function useUpdateKitchen(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: KitchenUpdate) => updateKitchen(id, body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: kitchenKeys.all });
      queryClient.setQueryData(kitchenKeys.detail(id), data);
    },
  });
}

export function useDeleteKitchen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteKitchen(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: kitchenKeys.all });
      queryClient.removeQueries({ queryKey: kitchenKeys.detail(id) });
    },
  });
}

// Kitchen admin — o'z oshxona sozlamalari
export function useKitchenMe() {
  return useQuery({
    queryKey: ['kitchen-me'] as const,
    queryFn: fetchKitchenMe,
    staleTime: 30_000,
  });
}

export function useUpdateKitchenSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: KitchenSettingsUpdate) => updateKitchenSettings(body),
    onSuccess: (data) => {
      queryClient.setQueryData(['kitchen-me'], data);
    },
  });
}

// ----------------------------------------------------------------------

export function usePendingAdmins() {
  return useQuery({
    queryKey: kitchenKeys.pendingAdmins,
    queryFn:  fetchPendingAdmins,
  });
}

export function useApproveAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => approveAdmin(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kitchenKeys.pendingAdmins });
    },
  });
}

export function useRejectAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => rejectAdmin(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kitchenKeys.pendingAdmins });
    },
  });
}
