import type { PropsWithChildren, ReactNode } from 'react';
import { Card, Text, XStack, YStack } from 'tamagui';

type AppCardProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  trailing?: ReactNode;
  pressable?: boolean;
  onPress?: () => void;
}>;

export function AppCard({ title, subtitle, trailing, children, pressable, onPress }: AppCardProps) {
  return (
    <Card
      borderRadius={20}
      backgroundColor="#F5F4F2"
      padding="$4"
      pressStyle={pressable ? { opacity: 0.82, scale: 0.995 } : undefined}
      onPress={onPress}>
      {(title || subtitle || trailing) && (
        <XStack alignItems="flex-start" justifyContent="space-between" gap="$3" marginBottom="$3">
          <YStack flex={1} gap="$1">
            {title && (
              <Text fontFamily="$heading" color="$color" fontSize="$5" fontWeight="800">
                {title}
              </Text>
            )}
            {subtitle && (
              <Text color="$gray10" fontSize="$3" lineHeight="$4">
                {subtitle}
              </Text>
            )}
          </YStack>
          {trailing}
        </XStack>
      )}
      {children}
    </Card>
  );
}
