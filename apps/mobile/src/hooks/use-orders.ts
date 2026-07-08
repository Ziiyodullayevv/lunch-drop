import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { cancelOrder, confirmDelivery, getOrder, listMonthlyOrders, listTodayOrders } from '@/lib/api/orders';
import { getTodayDate } from '@/lib/api/kitchens';
import { getEffectiveOrderStatus } from '@/lib/order-status';
import type { OrderStatus } from '@/types/domain';

const ACTIVE_STATUSES: OrderStatus[] = ['created', 'preparing', 'on_the_way'];

export function useOrders() {
  const query = useQuery({
    queryKey: ['orders', 'today', getTodayDate()],
    queryFn: listTodayOrders,
  });
  const orders = query.data ?? [];

  return {
    activeOrders: orders.filter((o) => ACTIVE_STATUSES.includes(getEffectiveOrderStatus(o))),
    historyOrders: orders.filter((o) => !ACTIVE_STATUSES.includes(getEffectiveOrderStatus(o))),
    orders,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useMonthlyOrders(month?: string) {
  const m = month ?? getTodayDate().slice(0, 7);
  const query = useQuery({
    queryKey: ['orders', 'monthly', m],
    queryFn: () => listMonthlyOrders(m),
  });
  return {
    orders: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useActiveOrder() {
  const query = useQuery({
    queryKey: ['orders', 'today', getTodayDate()],
    queryFn: listTodayOrders,
    refetchInterval: (q) => {
      const orders = q.state.data ?? [];
      const hasActive = orders.some((o) => ACTIVE_STATUSES.includes(getEffectiveOrderStatus(o)));
      return hasActive ? 8_000 : 30_000;
    },
  });
  const orders = query.data ?? [];
  const activeOrder = orders.find((o) => ACTIVE_STATUSES.includes(getEffectiveOrderStatus(o))) ?? null;
  return { activeOrder };
}

export function useOrder(orderId?: string | string[]) {
  const id = Array.isArray(orderId) ? orderId[0] : orderId;
  const query = useQuery({
    queryKey: ['orders', 'detail', id],
    queryFn: () => getOrder(id ?? ''),
    enabled: Boolean(id),
    refetchInterval: (q) => {
      const order = q.state.data;
      const status = order ? getEffectiveOrderStatus(order) : undefined;
      return status && ACTIVE_STATUSES.includes(status as OrderStatus) ? 15_000 : false;
    },
  });

  return {
    order: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => cancelOrder(orderId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useConfirmDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => confirmDelivery(orderId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
