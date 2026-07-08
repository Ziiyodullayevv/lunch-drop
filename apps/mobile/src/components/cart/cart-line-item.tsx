import { Image } from 'expo-image';
import { View } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import { QuantityStepper } from '@/components/ui';
import { formatMoney } from '@/constants/config';
import { useCart } from '@/stores/cart-store';
import type { CartItem } from '@/types/domain';

export function CartLineItem({ item }: { item: CartItem }) {
  const cart = useCart();

  return (
    <XStack alignItems="center" gap={12}>
      {item.menuItem.imageUrl ? (
        <Image
          source={{ uri: item.menuItem.imageUrl }}
          style={{ width: 64, height: 64, borderRadius: 14 }}
          contentFit="cover"
        />
      ) : (
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 14,
            backgroundColor: '#F0F0F3',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text fontSize={28}>🍽️</Text>
        </View>
      )}

      <YStack flex={1} gap={3}>
        <Text fontFamily="$heading" color="$color" fontSize={15} fontWeight="700" numberOfLines={1}>
          {item.menuItem.name}
        </Text>
        <Text color="$gray10" fontSize={13} fontWeight="500">
          {formatMoney(item.menuItem.price)}
          {item.menuItem.calories ? ` · ${item.menuItem.calories} g` : ''}
        </Text>
      </YStack>

      <QuantityStepper
        value={item.quantity}
        onChange={(quantity) => cart.updateQuantity(item.menuItem.id, quantity)}
      />
    </XStack>
  );
}
