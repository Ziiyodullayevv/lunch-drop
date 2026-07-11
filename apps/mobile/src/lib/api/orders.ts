import type { CreateOrderInput, OrderHistoryDto, OrderListResponseDto, OrderReadDto } from '@/types/api';
import type { CartItem, Order } from '@/types/domain';

import { apiClient } from './client';
import { getBranchKitchenSchedules, getTodayDate } from './kitchens';
import { mapOrder, mapOrderRead } from './mappers';

async function enrichOrdersWithKitchenSchedules(orders: Order[]): Promise<Order[]> {
  const branchIds = Array.from(new Set(orders.map((order) => order.branchId).filter(Boolean)));
  if (!branchIds.length) return orders;

  try {
    const scheduleEntries = await Promise.all(
      branchIds.map(async (branchId) => [branchId, await getBranchKitchenSchedules(branchId)] as const)
    );
    const schedulesByBranch = new Map(scheduleEntries);

    return orders.map((order) => {
      const info = schedulesByBranch.get(order.branchId)?.get(order.kitchenId);
      if (!info) return order;

      return {
        ...order,
        kitchenName: order.kitchenName || info.name,
        deliveryWindow: info.deliveryWindow,
        orderCutoffTime: info.orderCutoffTime,
        deliveryStartTime: info.deliveryStartTime,
        deliveryEndTime: info.deliveryEndTime,
      };
    });
  } catch (error) {
    console.warn('[Orders] kitchen schedule enrichment failed:', error);
    return orders;
  }
}

export async function listTodayOrders(): Promise<Order[]> {
  const res = await apiClient.get<OrderListResponseDto>('/orders', {
    params: { target_date: getTodayDate(), limit: 100 },
  });
  return enrichOrdersWithKitchenSchedules(res.data.items.map(mapOrder));
}

export async function listMonthlyOrders(month?: string): Promise<Order[]> {
  const m = month ?? getTodayDate().slice(0, 7);
  const res = await apiClient.get<OrderListResponseDto>('/orders', {
    params: { month: m, limit: 100 },
  });
  return enrichOrdersWithKitchenSchedules(res.data.items.map(mapOrder));
}

export async function getOrder(orderId: string): Promise<Order> {
  const res = await apiClient.get<OrderHistoryDto>(`/orders/${orderId}`);
  const [order] = await enrichOrdersWithKitchenSchedules([mapOrder(res.data)]);
  return order;
}

// Creates one order containing every cart item. targetDate format: "YYYY-MM-DD"
export async function createOrder(
  items: CartItem[],
  branchId: string,
  _note = '',
  targetDate?: string
): Promise<Order[]> {
  const date = targetDate ?? getTodayDate();
  if (!items.length) return [];
  const kitchenId = items[0].menuItem.kitchenId;
  if (items.some((item) => item.menuItem.kitchenId !== kitchenId)) {
    throw new Error('Bitta buyurtmadagi barcha taomlar bir oshxonadan bo‘lishi kerak');
  }
  const input: CreateOrderInput = {
    branch_id: branchId,
    kitchen_id: kitchenId,
    items: items.map((item) => ({ meal_id: item.menuItem.id, quantity: item.quantity })),
    target_date: date,
  };
  const res = await apiClient.post<OrderReadDto>('/orders', input);
  return [mapOrderRead(res.data)];
}

export async function cancelOrder(orderId: string): Promise<Order> {
  const res = await apiClient.post<OrderReadDto>(`/orders/${orderId}/cancel`);
  return mapOrderRead(res.data);
}

export async function confirmDelivery(orderId: string): Promise<Order> {
  const res = await apiClient.patch<OrderReadDto>(`/orders/${orderId}/confirm-delivery`);
  return mapOrderRead(res.data);
}
