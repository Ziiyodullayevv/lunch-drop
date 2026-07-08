import { Input as TamaguiInput, Label, Text, YStack } from 'tamagui';
import type { ComponentProps } from 'react';

type TamaguiInputProps = ComponentProps<typeof TamaguiInput>;

type AppInputProps = TamaguiInputProps & {
  label?: string;
  error?: string;
};

export function AppInput({ label, error, ...props }: AppInputProps) {
  return (
    <YStack gap="$2">
      {label && (
        <Label color="$gray11" fontSize="$3" fontWeight="700" lineHeight="$3">
          {label}
        </Label>
      )}
      <TamaguiInput
        minHeight={52}
        borderRadius="$4"
        borderColor={error ? '$red8' : '$gray6'}
        backgroundColor="$background"
        focusStyle={{ borderColor: '$green9' }}
        placeholderTextColor="$gray9"
        {...props}
      />
      {error && (
        <Text color="$red10" fontSize="$2" fontWeight="600">
          {error}
        </Text>
      )}
    </YStack>
  );
}
