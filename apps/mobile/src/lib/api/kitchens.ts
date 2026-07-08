import type { EmployeeMenuResponseDto, KitchenScheduleDto } from '@/types/api';
import type { MenuItem } from '@/types/domain';

import { apiClient } from './client';
import { mapEmployeeMenuItem } from './mappers';

export async function getEmployeeMenu(targetDate: string): Promise<MenuItem[]> {
  const res = await apiClient.get<EmployeeMenuResponseDto>('/employee/menu', {
    params: { target_date: targetDate },
  });
  console.log('[Menu] raw items[0]:', JSON.stringify(res.data.items[0], null, 2));
  return res.data.items.map((item) => ({
    ...mapEmployeeMenuItem(item),
    targetDate,
  }));
}

export type KitchenInfo = {
  name: string;
  orderCutoffTime: string;
  deliveryStartTime: string;
  deliveryEndTime: string;
  deliveryWindow: string;
};

export async function getBranchKitchenSchedules(branchId: string): Promise<Map<string, KitchenInfo>> {
  console.log('[Kitchens] fetching for branchId:', branchId);
  const res = await apiClient.get<KitchenScheduleDto[]>(`/company/branches/${branchId}/kitchens`);
  console.log('[Kitchens] raw response:', JSON.stringify(res.data, null, 2));
  const map = new Map<string, KitchenInfo>();
  for (const k of res.data) {
    const window = k.delivery_start_time && k.delivery_end_time
      ? `${k.delivery_start_time.slice(0, 5)} - ${k.delivery_end_time.slice(0, 5)}`
      : '';
    map.set(k.id, {
      name: k.name,
      orderCutoffTime: k.order_cutoff_time ?? '',
      deliveryStartTime: k.delivery_start_time ?? '',
      deliveryEndTime: k.delivery_end_time ?? '',
      deliveryWindow: window,
    });
  }
  return map;
}

// Tashkent = UTC+5. Converts weekday (1=Mon...7=Sun) to "YYYY-MM-DD" for current week.
export function weekdayToDate(weekday: number): string {
  const now = new Date(Date.now() + 5 * 60 * 60 * 1000);
  const jsDay = now.getUTCDay();
  const todayWeekday = jsDay === 0 ? 7 : jsDay;
  const diffDays = weekday - todayWeekday;
  const target = new Date(now.getTime() + diffDays * 24 * 60 * 60 * 1000);
  const y = target.getUTCFullYear();
  const m = String(target.getUTCMonth() + 1).padStart(2, '0');
  const d = String(target.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTodayDate(): string {
  const now = new Date(Date.now() + 5 * 60 * 60 * 1000);
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
