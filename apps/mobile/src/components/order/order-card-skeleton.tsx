import { Platform } from 'react-native';
import { XStack, YStack } from 'tamagui';

import { SkeletonBox } from '@/components/ui/skeleton-box';

const ORDER_CARD_BORDER = Platform.select({ android: 'transparent', default: 'rgba(0,0,0,0.07)' });
const ORDER_CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.045,
  shadowRadius: 8,
  boxShadow: '0px 0px 12px rgba(0,0,0,0.09)',
  elevation: 0,
};

export function OrderCardSkeleton() {
  return (
    <YStack
      borderRadius={20}
      backgroundColor="#FFFFFF"
      borderWidth={Platform.select({ android: 0, default: 0.5 })}
      borderColor={ORDER_CARD_BORDER}
      overflow="hidden"
      style={ORDER_CARD_SHADOW}
    >
      <YStack padding={16} gap={12}>
        {/* Top row */}
        <XStack alignItems="flex-start" justifyContent="space-between">
          <YStack gap={6}>
            <SkeletonBox style={{ height: 18, width: 130, borderRadius: 7 }} />
            <SkeletonBox style={{ height: 12, width: 95, borderRadius: 5 }} />
          </YStack>
          <XStack gap={8}>
            <SkeletonBox style={{ width: 36, height: 36, borderRadius: 10 }} />
            <SkeletonBox style={{ width: 36, height: 36, borderRadius: 10 }} />
          </XStack>
        </XStack>

        {/* Item rows */}
        {([0, 1] as const).map((i) => (
          <XStack key={i} alignItems="center" gap={10}>
            <SkeletonBox style={{ width: 52, height: 52, borderRadius: 10 }} />
            <SkeletonBox style={{ flex: 1, height: 15, borderRadius: 6 }} />
            <SkeletonBox style={{ width: 24, height: 14, borderRadius: 5 }} />
            <SkeletonBox style={{ width: 58, height: 14, borderRadius: 5 }} />
          </XStack>
        ))}

        {/* Total row */}
        <XStack
          borderTopWidth={0.5}
          borderTopColor="#E5E5EA"
          paddingTop={10}
          justifyContent="space-between"
          alignItems="center"
        >
          <SkeletonBox style={{ height: 13, width: 30, borderRadius: 5 }} />
          <SkeletonBox style={{ height: 16, width: 80, borderRadius: 6 }} />
        </XStack>
      </YStack>

      {/* Status button */}
      <YStack paddingHorizontal={16} paddingBottom={16}>
        <SkeletonBox style={{ height: 46, borderRadius: 14 }} />
      </YStack>
    </YStack>
  );
}
