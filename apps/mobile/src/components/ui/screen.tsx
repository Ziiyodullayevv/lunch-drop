import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, YStack, Text, XStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ScreenProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  scroll?: boolean;
}>;

export function Screen({ title, subtitle, action, scroll = true, children }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const content = (
    <YStack flex={1} gap="$4" padding="$4" paddingTop={Math.max(insets.top + 12, 24)}>
      {(title || subtitle || action) && (
        <XStack alignItems="flex-start" justifyContent="space-between" gap="$3">
          <YStack flex={1} gap="$1">
            {subtitle && (
              <Text color="$gray10" fontSize="$3" fontWeight="600">
                {subtitle}
              </Text>
            )}
            {title && (
              <Text fontFamily="$heading" color="$color" fontSize="$8" fontWeight="800" lineHeight="$8">
                {title}
              </Text>
            )}
          </YStack>
          {action}
        </XStack>
      )}
      {children}
    </YStack>
  );

  if (!scroll) {
    return (
      <YStack flex={1} backgroundColor="$background">
        {content}
      </YStack>
    );
  }

  return (
    <ScrollView flex={1} backgroundColor="$background" showsVerticalScrollIndicator={false}>
      {content}
    </ScrollView>
  );
}
