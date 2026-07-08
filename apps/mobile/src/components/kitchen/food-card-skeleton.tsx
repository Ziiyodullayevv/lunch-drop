import { View } from 'react-native';
import { XStack, YStack } from 'tamagui';

import { SkeletonBox } from '@/components/ui/skeleton-box';

export function FoodCardSkeleton() {
  return (
    <YStack>
      <View style={{ borderRadius: 22, overflow: 'hidden' }}>
        <SkeletonBox style={{ width: '100%', aspectRatio: 2 }} />
      </View>

      <XStack paddingTop={10} paddingHorizontal={4} alignItems="flex-start" justifyContent="space-between" gap={8}>
        <YStack flex={1} gap={6}>
          <SkeletonBox style={{ height: 17, width: '72%', borderRadius: 6 }} />
          <SkeletonBox style={{ height: 13, width: '48%', borderRadius: 5 }} />
        </YStack>
        <YStack alignItems="flex-end" gap={6}>
          <SkeletonBox style={{ height: 13, width: 38, borderRadius: 5 }} />
          <SkeletonBox style={{ height: 13, width: 58, borderRadius: 5 }} />
        </YStack>
      </XStack>
    </YStack>
  );
}
