import axiosInstance, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

export type MenuCategoryRead = {
  id: string;
  kitchen_id: string;
  name: string;
};

export type MealRead = {
  id: string;
  kitchen_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: string;
  image_url: string | null;
  created_at: string;
};

export type MealCreate = {
  name: string;
  price: number | string;
  description?: string | null;
  image_url?: string | null;
  category_id?: string | null;
};

export type MealUpdate = Partial<MealCreate>;

export type PageMeal = {
  items: MealRead[];
  total: number;
  limit: number;
  offset: number;
};

export type MenuScheduleRead = {
  id: string;
  meal_id: string;
  day_of_week: number | null;
  specific_date: string | null;
};

export type ScheduleMenuRequest = {
  meal_id: string;
  day_of_week?: number | null;
  specific_date?: string | null;
};

// ----------------------------------------------------------------------

export function fetchCategories() {
  return fetcher<MenuCategoryRead[]>(endpoints.kitchen.categories);
}

export function createCategory(name: string) {
  return axiosInstance
    .post<MenuCategoryRead>(endpoints.kitchen.categories, { name })
    .then((r) => r.data);
}

// ----------------------------------------------------------------------

export function fetchMeals(params?: { limit?: number; offset?: number }) {
  return fetcher<PageMeal>([endpoints.kitchen.meals, { params }]);
}

export function fetchMeal(id: string) {
  return fetcher<MealRead>(endpoints.kitchen.meal(id));
}

export function createMeal(body: MealCreate) {
  return axiosInstance.post<MealRead>(endpoints.kitchen.meals, body).then((r) => r.data);
}

export function updateMeal(id: string, body: MealUpdate) {
  return axiosInstance.patch<MealRead>(endpoints.kitchen.meal(id), body).then((r) => r.data);
}

export function deleteMeal(id: string) {
  return axiosInstance.delete(endpoints.kitchen.meal(id));
}

export function uploadMealImage(id: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  return axiosInstance
    .post<MealRead>(endpoints.kitchen.mealImage(id), form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
}

// ----------------------------------------------------------------------

export function fetchSchedules(params?: { meal_id?: string }) {
  return fetcher<MenuScheduleRead[]>([endpoints.kitchen.schedules, { params }]);
}

export function scheduleMenu(body: ScheduleMenuRequest) {
  return axiosInstance
    .post<MenuScheduleRead>(endpoints.kitchen.scheduleMenu, body)
    .then((r) => r.data);
}

export function deleteSchedule(id: string) {
  return axiosInstance.delete(endpoints.kitchen.schedule(id));
}
