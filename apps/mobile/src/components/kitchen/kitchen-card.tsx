import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Text, XStack, YStack } from 'tamagui';

import { AppCard, StatusBadge } from '@/components/ui';
import type { Kitchen } from '@/types/domain';

type KitchenCardProps = {
  kitchen: Kitchen;
};

export function KitchenCard({ kitchen }: KitchenCardProps) {
  return (
    <AppCard pressable onPress={() => router.push(`/kitchen/${kitchen.id}`)}>
      <YStack gap="$3">
        <Image
          source={{ uri: kitchen.coverUrl }}
          style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 12 }}
          contentFit="cover"
        />
        <YStack gap="$2">
          <XStack alignItems="flex-start" justifyContent="space-between" gap="$3">
            <YStack flex={1} gap="$1">
              <Text fontFamily="$heading" color="$color" fontSize="$6" fontWeight="900">
                {kitchen.name}
              </Text>
              <Text color="$gray10" fontSize="$3" lineHeight="$4">
                {kitchen.description}
              </Text>
            </YStack>
            {kitchen.isFavorite && <StatusBadge label="Favorite" tone="warning" />}
          </XStack>
          <XStack flexWrap="wrap" gap="$2">
            <StatusBadge label={`${kitchen.rating} rating`} tone="success" />
            <StatusBadge label={`Cutoff ${kitchen.cutoffTime}`} tone="info" />
            <StatusBadge label={`${kitchen.distanceKm} km`} />
          </XStack>
        </YStack>
      </YStack>
    </AppCard>
  );
}
