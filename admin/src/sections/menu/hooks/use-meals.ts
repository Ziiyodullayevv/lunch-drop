import type { MealCreate, MealUpdate, ScheduleMenuRequest } from 'src/lib/api/meals';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  fetchMeal,
  createMeal,
  deleteMeal,
  fetchMeals,
  updateMeal,
  scheduleMenu,
  createCategory,
  deleteSchedule,
  fetchSchedules,
  fetchCategories,
  uploadMealImage,
} from 'src/lib/api/meals';

// ----------------------------------------------------------------------

export const mealKeys = {
  all:       ['meals'] as const,
  list:      (params?: object) => [...mealKeys.all, 'list', params] as const,
  detail:    (id: string)     => [...mealKeys.all, 'detail', id] as const,
  categories: ['meal-categories'] as const,
  schedules:  (params?: object) => ['meal-schedules', params] as const,
};

// ----------------------------------------------------------------------

export function useCategories() {
  return useQuery({
    queryKey: mealKeys.categories,
    queryFn:  fetchCategories,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createCategory(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mealKeys.categories });
    },
  });
}

// ----------------------------------------------------------------------

export function useMeals(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: mealKeys.list(params),
    queryFn:  () => fetchMeals(params),
  });
}

export function useMeal(id: string) {
  return useQuery({
    queryKey: mealKeys.detail(id),
    queryFn:  () => fetchMeal(id),
    enabled:  !!id,
  });
}

export function useCreateMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: MealCreate) => createMeal(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mealKeys.all });
    },
  });
}

export function useUpdateMeal(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: MealUpdate) => updateMeal(id, body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: mealKeys.all });
      queryClient.setQueryData(mealKeys.detail(id), data);
    },
  });
}

export function useDeleteMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMeal(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: mealKeys.all });
      queryClient.removeQueries({ queryKey: mealKeys.detail(id) });
    },
  });
}

export function useUploadMealImage(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadMealImage(id, file),
    onSuccess: (data) => {
      queryClient.setQueryData(mealKeys.detail(id), data);
      queryClient.invalidateQueries({ queryKey: mealKeys.all });
    },
  });
}

// ----------------------------------------------------------------------

export function useSchedules(params?: { meal_id?: string }) {
  return useQuery({
    queryKey: mealKeys.schedules(params),
    queryFn:  () => fetchSchedules(params),
  });
}

export function useScheduleMenu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ScheduleMenuRequest) => scheduleMenu(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-schedules'] });
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-schedules'] });
    },
  });
}
