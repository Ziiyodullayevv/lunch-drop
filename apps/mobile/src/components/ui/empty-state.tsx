import type { ReactNode } from 'react';
import { Text, YStack } from 'tamagui';

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <YStack
      alignItems="center"
      justifyContent="center"
      gap="$3"
      minHeight={220}
      borderWidth={1}
      borderColor="$gray5"
      borderRadius="$4"
      borderStyle="dashed"
      padding="$5">
      <Text fontFamily="$heading" color="$color" fontSize="$5" fontWeight="800" textAlign="center">
        {title}
      </Text>
      {description && (
        <Text color="$gray10" fontSize="$3" lineHeight="$5" textAlign="center">
          {description}
        </Text>
      )}
      {action}
    </YStack>
  );
}
