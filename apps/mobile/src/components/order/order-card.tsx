import { router } from 'expo-router';
import { Text, XStack, YStack } from 'tamagui';

import { AppCard } from '@/components/ui';
import { formatMoney } from '@/constants/config';
import type { Order } from '@/types/domain';

import { OrderStatusBadge } from './order-status-badge';

type OrderCardProps = {
  order: Order;
};

export function OrderCard({ order }: OrderCardProps) {
  const summary = order.items.map((item) => `${item.quantity}x ${item.name}`).join(', ');

  return (
    <AppCard pressable onPress={() => router.push(`/order/${order.id}`)}>
      <YStack gap="$3">
        <XStack justifyContent="space-between" alignItems="flex-start" gap="$3">
          <YStack flex={1} gap="$1">
            <Text fontFamily="$heading" color="$color" fontSize="$5" fontWeight="900">
              {order.kitchenName}
            </Text>
            <Text color="$gray10" fontSize="$3" lineHeight="$4">
              {summary}
            </Text>
          </YStack>
          <OrderStatusBadge order={order} />
        </XStack>
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontFamily="$heading" color="$gray10" fontSize="$3" fontWeight="700">
            {order.createdAt}
          </Text>
          <Text fontFamily="$heading" color="$color" fontSize="$4" fontWeight="900">
            {formatMoney(order.total)}
          </Text>
        </XStack>
      </YStack>
    </AppCard>
  );
}
