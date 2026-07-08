import { useQuery } from '@tanstack/react-query';

import { getBranchKitchenSchedules, getEmployeeMenu, weekdayToDate } from '@/lib/api/kitchens';
import { useAuthStore } from '@/stores/auth-store';

export function useAllFoodItems(weekday?: number) {
  const isApproved = useAuthStore(
    (s) => s.user?.status === 'active' && s.user?.accountStatus === 'approved'
  );
  const branchId = useAuthStore((s) => s.user?.branchId ?? '');

  const targetDate = weekday !== undefined ? weekdayToDate(weekday) : weekdayToDate(
    (() => {
      const d = new Date(Date.now() + 5 * 60 * 60 * 1000);
      const j = d.getUTCDay();
      return j === 0 ? 7 : j;
    })()
  );

  const menuQuery = useQuery({
    queryKey: ['employee-menu', targetDate],
    queryFn: () => getEmployeeMenu(targetDate),
    enabled: isApproved ?? false,
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
  });

  const scheduleQuery = useQuery({
    queryKey: ['branch-kitchen-schedules', branchId],
    queryFn: () => getBranchKitchenSchedules(branchId),
    enabled: !!(isApproved && branchId),
    staleTime: 30 * 60 * 1000,
    retry: false,
  });

  const scheduleMap = scheduleQuery.data;
  if (scheduleQuery.error) {
    console.warn('[Kitchens] scheduleQuery error:', scheduleQuery.error);
  }
  console.log('[Kitchens] branchId:', branchId, '| scheduleMap size:', scheduleMap?.size ?? 'null');
  const items = (menuQuery.data ?? []).map((item) => {
    if (!scheduleMap) return item;
    const info = scheduleMap.get(item.kitchenId);
    if (!info) return item;
    return {
      ...item,
      kitchenName: item.kitchenName || info.name,
      kitchenDeliveryWindow: item.kitchenDeliveryWindow || info.deliveryWindow,
      kitchenOrderCutoffTime: info.orderCutoffTime,
      kitchenDeliveryStartTime: info.deliveryStartTime,
      kitchenDeliveryEndTime: info.deliveryEndTime,
    };
  });

  return {
    items,
    isLoading: menuQuery.isLoading,
    error: menuQuery.error,
    refetch: menuQuery.refetch,
  };
}
