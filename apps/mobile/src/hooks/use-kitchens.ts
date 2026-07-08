import { useQuery } from '@tanstack/react-query';

import { getEmployeeMenu, getTodayDate, weekdayToDate } from '@/lib/api/kitchens';
import { useAuthStore } from '@/stores/auth-store';
import type { Kitchen, MenuCategory } from '@/types/domain';

export function useKitchens() {
  const isApproved = useAuthStore((s) => s.user?.status === 'active');
  const today = getTodayDate();

  const query = useQuery({
    queryKey: ['employee-menu', today],
    queryFn: () => getEmployeeMenu(today),
    enabled: isApproved ?? false,
    staleTime: 5 * 60 * 1000,
  });

  const items = query.data ?? [];
  const kitchenMap = new Map<string, Kitchen>();
  for (const item of items) {
    if (!kitchenMap.has(item.kitchenId)) {
      kitchenMap.set(item.kitchenId, {
        id: item.kitchenId,
        name: item.kitchenName || '',
        description: '',
        rating: 0,
        reviewCount: 0,
        cutoffTime: item.kitchenOrderCutoffTime || '',
        deliveryWindow: item.kitchenDeliveryWindow || '',
        distanceKm: 0,
        coverUrl: '',
        isFavorite: false,
        tags: [],
      });
    }
  }

  return {
    kitchens: Array.from(kitchenMap.values()),
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useKitchen(kitchenId?: string | string[], weekday?: number) {
  const id = Array.isArray(kitchenId) ? kitchenId[0] : kitchenId;
  const isApproved = useAuthStore((s) => s.user?.status === 'active');

  const targetDate =
    weekday !== undefined
      ? weekdayToDate(weekday)
      : getTodayDate();

  const query = useQuery({
    queryKey: ['employee-menu', targetDate],
    queryFn: () => getEmployeeMenu(targetDate),
    enabled: Boolean(id) && (isApproved ?? false),
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
  });

  const allItems = query.data ?? [];
  const kitchenItems = allItems.filter((item) => item.kitchenId === id);

  const kitchen: Kitchen | null =
    kitchenItems.length > 0
      ? {
          id: id!,
          name: kitchenItems[0].kitchenName || '',
          description: '',
          rating: 0,
          reviewCount: 0,
          cutoffTime: kitchenItems[0].kitchenOrderCutoffTime || '',
          deliveryWindow: kitchenItems[0].kitchenDeliveryWindow || '',
          distanceKm: 0,
          coverUrl: '',
          isFavorite: false,
          tags: [],
        }
      : null;

  // Build categories from items
  const categoryMap = new Map<string, MenuCategory>();
  for (const item of kitchenItems) {
    if (!categoryMap.has(item.categoryId)) {
      categoryMap.set(item.categoryId, { id: item.categoryId, title: item.categoryTitle });
    }
  }

  return {
    kitchen,
    categories: Array.from(categoryMap.values()),
    menuItems: kitchenItems,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
  };
}
