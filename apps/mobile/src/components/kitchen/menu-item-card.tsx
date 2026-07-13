import { Text, XStack, YStack } from 'tamagui';

import { AppButton, AppCard, StatusBadge } from '@/components/ui';
import { formatMoney } from '@/constants/config';
import { useTodayOrderGuard } from '@/hooks/use-today-order-guard';
import { useCart } from '@/stores/cart-store';
import type { MenuItem } from '@/types/domain';

export function MenuItemCard({ item }: { item: MenuItem }) {
  const cart = useCart();
  const canOrderForDate = useTodayOrderGuard();
  const handleAdd = () => {
    if (!canOrderForDate(item.targetDate, item.kitchenOrderCutoffTime)) return;
    cart.addItem(item, item.kitchenName);
  };

  return (
    <AppCard>
      <YStack gap="$3">
        <XStack alignItems="flex-start" justifyContent="space-between" gap="$3">
          <YStack flex={1} gap="$1">
            <XStack alignItems="center" gap="$2" flexWrap="wrap">
              <Text fontFamily="$heading" color="$color" fontSize="$5" fontWeight="900">
                {item.name}
              </Text>
              {item.isPopular && <StatusBadge label="Popular" tone="success" />}
            </XStack>
            <Text color="$gray10" fontSize="$3" lineHeight="$4">
              {item.description}
            </Text>
            {item.calories && (
              <Text fontFamily="$heading" color="$gray9" fontSize="$2" fontWeight="700">
                {item.calories} kcal
              </Text>
            )}
          </YStack>
          <Text fontFamily="$heading" color="$color" fontSize="$4" fontWeight="900">
            {formatMoney(item.price)}
          </Text>
        </XStack>
        <AppButton
          label="Savatga qo'shish"
          disabled={!item.isAvailable}
          onPress={handleAdd}
        />
      </YStack>
    </AppCard>
  );
}
