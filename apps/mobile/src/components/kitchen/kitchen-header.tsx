import { Image } from 'expo-image';
import { Text, XStack, YStack } from 'tamagui';

import { StatusBadge } from '@/components/ui';
import type { Kitchen } from '@/types/domain';

type KitchenHeaderProps = {
  kitchen: Kitchen;
};

export function KitchenHeader({ kitchen }: KitchenHeaderProps) {
  return (
    <YStack gap="$4">
      <Image
        source={{ uri: kitchen.coverUrl }}
        style={{ width: '100%', aspectRatio: 16 / 10, borderRadius: 16 }}
        contentFit="cover"
      />
      <YStack gap="$2">
        <Text fontFamily="$heading" color="$color" fontSize="$8" fontWeight="900" lineHeight="$8">
          {kitchen.name}
        </Text>
        <Text color="$gray10" fontSize="$4" lineHeight="$5">
          {kitchen.description}
        </Text>
        <XStack gap="$2" flexWrap="wrap">
          <StatusBadge label={`${kitchen.rating} rating`} tone="success" />
          <StatusBadge label={`Order by ${kitchen.cutoffTime}`} tone="info" />
          <StatusBadge label={kitchen.deliveryWindow} />
        </XStack>
      </YStack>
    </YStack>
  );
}
