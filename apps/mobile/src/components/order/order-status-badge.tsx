import { StatusBadge } from '@/components/ui';
import { getEffectiveOrderStatus } from '@/lib/order-status';
import type { Order, OrderStatus } from '@/types/domain';

const statusMap: Record<OrderStatus, { label: string; tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }> = {
  created:    { label: 'Qabul qilindi',   tone: 'warning' },
  preparing:  { label: 'Tayyorlanmoqda', tone: 'info'    },
  on_the_way: { label: "Yo'lda",         tone: 'info'    },
  delivered:  { label: 'Yetkazildi',     tone: 'success' },
  cancelled:  { label: 'Bekor qilindi',  tone: 'danger'  },
};

type OrderStatusBadgeProps = {
  status?: OrderStatus;
  order?: Order;
};

export function OrderStatusBadge({ status, order }: OrderStatusBadgeProps) {
  const resolvedStatus = order ? getEffectiveOrderStatus(order) : status;
  const item = statusMap[resolvedStatus ?? 'created'];
  return <StatusBadge label={item.label} tone={item.tone} />;
}
