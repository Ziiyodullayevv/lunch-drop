import type { Order, OrderStatus } from '@/types/domain';

const TASHKENT_OFFSET = '+05:00';

function timeToDate(targetDate: string, time?: string | null): Date | null {
  if (!targetDate || !time) return null;
  const [hours = '00', minutes = '00', seconds = '00'] = time.split(':');
  const date = new Date(`${targetDate}T${hours}:${minutes}:${seconds}${TASHKENT_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getEffectiveOrderStatus(order: Order, now = new Date()): OrderStatus {
  if (order.status === 'cancelled') return 'cancelled';

  const cutoffAt = timeToDate(order.targetDate, order.orderCutoffTime);
  const deliveryStartAt = timeToDate(order.targetDate, order.deliveryStartTime);
  const deliveryEndAt = timeToDate(order.targetDate, order.deliveryEndTime);

  if (deliveryEndAt && now >= deliveryEndAt) return 'delivered';
  if (deliveryStartAt && now >= deliveryStartAt) return 'on_the_way';
  if (order.status === 'on_the_way') return 'on_the_way';

  if (deliveryEndAt && order.status === 'delivered') {
    return deliveryStartAt && now >= deliveryStartAt ? 'on_the_way' : 'preparing';
  }

  if (cutoffAt && now >= cutoffAt && order.status === 'created') return 'preparing';

  return order.status;
}

export function canCancelOrder(order: Order, now = new Date()) {
  if (order.status === 'cancelled' || order.status === 'delivered') return false;

  const cutoffAt = timeToDate(order.targetDate, order.orderCutoffTime);
  if (!cutoffAt) return order.status === 'created';

  return now < cutoffAt;
}
