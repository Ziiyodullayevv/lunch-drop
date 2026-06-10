import { it, vi, expect, describe, beforeEach } from 'vitest';

vi.mock('src/lib/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  fetcher: vi.fn(),
  endpoints: {
    kitchen: {
      categories:   '/api/v1/kitchen/categories',
      meals:        '/api/v1/kitchen/meals',
      meal:         (id: string) => `/api/v1/kitchen/meals/${id}`,
      schedules:    '/api/v1/kitchen/schedules',
      schedule:     (id: string) => `/api/v1/kitchen/schedules/${id}`,
      scheduleMenu: '/api/v1/kitchen/schedule-menu',
    },
  },
}));

import axiosInstance, { fetcher } from 'src/lib/axios';

import {
  fetchMeal, createMeal, deleteMeal, fetchMeals,
  updateMeal, scheduleMenu, createCategory, deleteSchedule, fetchSchedules, fetchCategories,
} from './meals';

const mockAxios   = vi.mocked(axiosInstance);
const mockFetcher = vi.mocked(fetcher);

const mockCategory = { id: 'cat-1', kitchen_id: 'k-1', name: "Sho'rvalar" };
const mockMeal = {
  id: 'm-1', kitchen_id: 'k-1', category_id: 'cat-1', name: 'Osh', description: null,
  price: '25000.00', image_url: null, created_at: '2024-01-01T00:00:00Z',
};
const mockSchedule = { id: 'sc-1', meal_id: 'm-1', day_of_week: 1, specific_date: null };

beforeEach(() => vi.clearAllMocks());

// ----------------------------------------------------------------------

describe('fetchCategories', () => {
  it("kategoriyalar ro'yxatini qaytaradi", async () => {
    mockFetcher.mockResolvedValueOnce([mockCategory]);
    expect((await fetchCategories())[0].name).toBe("Sho'rvalar");
  });

  it("bo'sh array qaytarishi mumkin", async () => {
    mockFetcher.mockResolvedValueOnce([]);
    expect(await fetchCategories()).toHaveLength(0);
  });

  it("xato bo'lsa reject qiladi", async () => {
    mockFetcher.mockRejectedValueOnce(new Error('403'));
    await expect(fetchCategories()).rejects.toThrow('403');
  });
});

describe('createCategory', () => {
  it("yangi kategoriya yaratadi", async () => {
    mockAxios.post.mockResolvedValueOnce({ data: mockCategory });
    const result = await createCategory("Sho'rvalar");
    expect(result.id).toBe('cat-1');
    expect(mockAxios.post).toHaveBeenCalledWith('/api/v1/kitchen/categories', { name: "Sho'rvalar" });
  });
});

// ----------------------------------------------------------------------

describe('fetchMeals', () => {
  it("taomlar ro'yxatini qaytaradi", async () => {
    mockFetcher.mockResolvedValueOnce({ items: [mockMeal], total: 1, limit: 20, offset: 0 });
    const result = await fetchMeals();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].price).toBe('25000.00');
    expect(result.total).toBe(1);
  });
});

describe('fetchMeal', () => {
  it("bitta taomni qaytaradi", async () => {
    mockFetcher.mockResolvedValueOnce(mockMeal);
    const result = await fetchMeal('m-1');
    expect(result.id).toBe('m-1');
    expect(result.category_id).toBe('cat-1');
  });
});

describe('createMeal', () => {
  it("yangi taom yaratadi", async () => {
    mockAxios.post.mockResolvedValueOnce({ data: mockMeal });
    const result = await createMeal({ name: 'Osh', price: 25000 });
    expect(result.id).toBe('m-1');
    expect(mockAxios.post).toHaveBeenCalledWith('/api/v1/kitchen/meals', { name: 'Osh', price: 25000 });
  });

  it("category_id bilan yaratiladi", async () => {
    mockAxios.post.mockResolvedValueOnce({ data: mockMeal });
    await createMeal({ name: 'Osh', price: 25000, category_id: 'cat-1' });
    expect(mockAxios.post).toHaveBeenCalledWith(
      '/api/v1/kitchen/meals',
      expect.objectContaining({ category_id: 'cat-1' })
    );
  });
});

describe('updateMeal', () => {
  it("taomni yangilaydi", async () => {
    mockAxios.patch.mockResolvedValueOnce({ data: { ...mockMeal, name: 'Yangilangan Osh' } });
    expect((await updateMeal('m-1', { name: 'Yangilangan Osh' })).name).toBe('Yangilangan Osh');
  });

  it("narxni yangilaydi", async () => {
    mockAxios.patch.mockResolvedValueOnce({ data: { ...mockMeal, price: '30000.00' } });
    expect((await updateMeal('m-1', { price: 30000 })).price).toBe('30000.00');
  });
});

describe('deleteMeal', () => {
  it("delete endpointga murojaat qiladi", async () => {
    mockAxios.delete.mockResolvedValueOnce({ status: 204 });
    const res = await deleteMeal('m-1');
    expect(res.status).toBe(204);
    expect(mockAxios.delete).toHaveBeenCalledWith('/api/v1/kitchen/meals/m-1');
  });
});

// ----------------------------------------------------------------------

describe('fetchSchedules', () => {
  it("jadval ro'yxatini qaytaradi", async () => {
    mockFetcher.mockResolvedValueOnce([mockSchedule]);
    const result = await fetchSchedules();
    expect(result[0].day_of_week).toBe(1);
    expect(result[0].specific_date).toBeNull();
  });

  it("specific_date bilan ham ishlaydi", async () => {
    mockFetcher.mockResolvedValueOnce([{ ...mockSchedule, day_of_week: null, specific_date: '2024-01-15' }]);
    const result = await fetchSchedules();
    expect(result[0].specific_date).toBe('2024-01-15');
    expect(result[0].day_of_week).toBeNull();
  });
});

describe('scheduleMenu', () => {
  it("hafta kuniga taom qo'yadi", async () => {
    mockAxios.post.mockResolvedValueOnce({ data: mockSchedule });
    const result = await scheduleMenu({ meal_id: 'm-1', day_of_week: 1 });
    expect(result.id).toBe('sc-1');
    expect(mockAxios.post).toHaveBeenCalledWith('/api/v1/kitchen/schedule-menu', { meal_id: 'm-1', day_of_week: 1 });
  });

  it("aniq sanaga taom qo'yadi", async () => {
    const dated = { ...mockSchedule, day_of_week: null, specific_date: '2024-01-15' };
    mockAxios.post.mockResolvedValueOnce({ data: dated });
    const result = await scheduleMenu({ meal_id: 'm-1', specific_date: '2024-01-15' });
    expect(result.specific_date).toBe('2024-01-15');
  });
});

describe('deleteSchedule', () => {
  it("jadvaldan o'chiradi", async () => {
    mockAxios.delete.mockResolvedValueOnce({ status: 204 });
    const res = await deleteSchedule('sc-1');
    expect(res.status).toBe(204);
    expect(mockAxios.delete).toHaveBeenCalledWith('/api/v1/kitchen/schedules/sc-1');
  });
});
