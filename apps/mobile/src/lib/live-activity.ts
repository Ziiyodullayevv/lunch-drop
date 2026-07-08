import { Platform } from 'react-native';

import { LiveActivity } from '../../modules/LiveActivity';

type OrderStatus = 'cooking' | 'ready' | 'delivered';

const STORAGE_KEY_PREFIX = 'live_activity_';

// activityId ni memory'da saqlaymiz (session scope)
const activeIds = new Map<string, string>();

function estimatedTime(): string {
  return '12:30 — 13:00';
}

export async function startOrderLiveActivity(params: {
  orderId: string;
  itemCount: number;
  kitchenName: string;
  status: OrderStatus;
}): Promise<void> {
  if (Platform.OS !== 'ios') return;
  if (!LiveActivity.isSupported()) return;

  // agar allaqachon boshlanmagan bo'lsa
  if (activeIds.has(params.orderId)) return;

  const activityId = await LiveActivity.start({
    orderId: params.orderId,
    itemCount: params.itemCount,
    status: params.status,
    kitchenName: params.kitchenName,
    estimatedTime: estimatedTime(),
  });

  if (activityId) {
    activeIds.set(params.orderId, activityId);
  }
}

export async function updateOrderLiveActivity(params: {
  orderId: string;
  status: OrderStatus;
  kitchenName: string;
}): Promise<void> {
  if (Platform.OS !== 'ios') return;

  const activityId = activeIds.get(params.orderId);
  if (!activityId) return;

  await LiveActivity.update(activityId, {
    status: params.status,
    kitchenName: params.kitchenName,
    estimatedTime: estimatedTime(),
  });
}

export async function endOrderLiveActivity(orderId: string): Promise<void> {
  if (Platform.OS !== 'ios') return;

  const activityId = activeIds.get(orderId);
  if (!activityId) return;

  await LiveActivity.end(activityId);
  activeIds.delete(orderId);
}
