import { createElement } from 'react';
import { waitFor, renderHook } from '@testing-library/react';
import { it, vi, expect, describe, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('src/lib/api/meals', () => ({
  fetchCategories: vi.fn(),
  createCategory:  vi.fn(),
  fetchMeals:      vi.fn(),
  fetchMeal:       vi.fn(),
  createMeal:      vi.fn(),
  updateMeal:      vi.fn(),
  deleteMeal:      vi.fn(),
  uploadMealImage: vi.fn(),
  fetchSchedules:  vi.fn(),
  scheduleMenu:    vi.fn(),
  deleteSchedule:  vi.fn(),
}));

import * as api from 'src/lib/api/meals';

import {
  useMeal,
  useMeals,
  useSchedules,
  useCategories,
  useCreateMeal,
  useDeleteMeal,
  useUpdateMeal,
  useScheduleMenu,
  useCreateCategory,
  useDeleteSchedule,
} from './use-meals';

// ----------------------------------------------------------------------

const mockFetchCategories = vi.mocked(api.fetchCategories);
const mockCreateCategory  = vi.mocked(api.createCategory);
const mockFetchMeals      = vi.mocked(api.fetchMeals);
const mockFetchMeal       = vi.mocked(api.fetchMeal);
const mockCreateMeal      = vi.mocked(api.createMeal);
const mockUpdateMeal      = vi.mocked(api.updateMeal);
const mockDeleteMeal      = vi.mocked(api.deleteMeal);
const mockFetchSchedules  = vi.mocked(api.fetchSchedules);
const mockScheduleMenu    = vi.mocked(api.scheduleMenu);
const mockDeleteSchedule  = vi.mocked(api.deleteSchedule);

const mockCategory = { id: 'cat-1', kitchen_id: 'k-1', name: "Sho'rvalar" };
const mockMeal = {
  id: 'm-1', kitchen_id: 'k-1', category_id: 'cat-1',
  name: 'Osh', description: null, price: '25000.00', image_url: null, created_at: '2024-01-01T00:00:00Z',
};
const mockSchedule = { id: 'sc-1', meal_id: 'm-1', day_of_week: 1, specific_date: null };

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => vi.clearAllMocks());

// ----------------------------------------------------------------------

describe('useCategories', () => {
  it("kategoriyalar ro'yxatini yuklaydi", async () => {
    mockFetchCategories.mockResolvedValueOnce([mockCategory]);
    const { result } = renderHook(() => useCategories(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].name).toBe("Sho'rvalar");
  });

  it("server xatosida isError bo'ladi", async () => {
    mockFetchCategories.mockRejectedValueOnce(new Error('403'));
    const { result } = renderHook(() => useCategories(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useCreateCategory', () => {
  it("yangi kategoriya yaratadi", async () => {
    mockCreateCategory.mockResolvedValueOnce(mockCategory);
    const { result } = renderHook(() => useCreateCategory(), { wrapper });
    const created = await result.current.mutateAsync("Sho'rvalar");
    expect(created.id).toBe('cat-1');
    expect(mockCreateCategory).toHaveBeenCalledWith("Sho'rvalar");
  });
});

// ----------------------------------------------------------------------

describe('useMeals', () => {
  it("taomlar ro'yxatini yuklaydi", async () => {
    mockFetchMeals.mockResolvedValueOnce({ items: [mockMeal], total: 1, limit: 20, offset: 0 });
    const { result } = renderHook(() => useMeals(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.items).toHaveLength(1);
    expect(result.current.data?.total).toBe(1);
  });
});

describe('useMeal', () => {
  it("bitta taomni yuklaydi", async () => {
    mockFetchMeal.mockResolvedValueOnce(mockMeal);
    const { result } = renderHook(() => useMeal('m-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.price).toBe('25000.00');
  });

  it("bo'sh id bilan query ishlamaydi", () => {
    const { result } = renderHook(() => useMeal(''), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockFetchMeal).not.toHaveBeenCalled();
  });
});

describe('useCreateMeal', () => {
  it("yangi taom yaratadi", async () => {
    mockCreateMeal.mockResolvedValueOnce(mockMeal);
    const { result } = renderHook(() => useCreateMeal(), { wrapper });
    const created = await result.current.mutateAsync({ name: 'Osh', price: 25000 });
    expect(created.id).toBe('m-1');
  });
});

describe('useUpdateMeal', () => {
  it("taomni yangilaydi", async () => {
    mockUpdateMeal.mockResolvedValueOnce({ ...mockMeal, name: 'Yangilangan Osh' });
    const { result } = renderHook(() => useUpdateMeal('m-1'), { wrapper });
    const updated = await result.current.mutateAsync({ name: 'Yangilangan Osh' });
    expect(updated.name).toBe('Yangilangan Osh');
  });
});

describe('useDeleteMeal', () => {
  it("taomni o'chiradi", async () => {
    mockDeleteMeal.mockResolvedValueOnce({ status: 204, data: null, headers: {}, config: {} as any, statusText: '' });
    const { result } = renderHook(() => useDeleteMeal(), { wrapper });
    await result.current.mutateAsync('m-1');
    expect(mockDeleteMeal).toHaveBeenCalledWith('m-1');
  });
});

// ----------------------------------------------------------------------

describe('useSchedules', () => {
  it("jadval ro'yxatini yuklaydi", async () => {
    mockFetchSchedules.mockResolvedValueOnce([mockSchedule]);
    const { result } = renderHook(() => useSchedules(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].day_of_week).toBe(1);
  });
});

describe('useScheduleMenu', () => {
  it("taomni jadvalga qo'shadi", async () => {
    mockScheduleMenu.mockResolvedValueOnce(mockSchedule);
    const { result } = renderHook(() => useScheduleMenu(), { wrapper });
    const created = await result.current.mutateAsync({ meal_id: 'm-1', day_of_week: 1 });
    expect(created.id).toBe('sc-1');
  });
});

describe('useDeleteSchedule', () => {
  it("jadvaldan o'chiradi", async () => {
    mockDeleteSchedule.mockResolvedValueOnce({ status: 204, data: null, headers: {}, config: {} as any, statusText: '' });
    const { result } = renderHook(() => useDeleteSchedule(), { wrapper });
    await result.current.mutateAsync('sc-1');
    expect(mockDeleteSchedule).toHaveBeenCalledWith('sc-1');
  });
});
