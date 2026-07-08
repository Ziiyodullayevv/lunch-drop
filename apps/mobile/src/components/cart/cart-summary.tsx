import { Separator, Text, XStack, YStack } from 'tamagui';

import { formatMoney } from '@/constants/config';

type CartSummaryProps = {
  subtotal: number;
};

export function CartSummary({ subtotal }: CartSummaryProps) {
  const serviceFee = subtotal > 0 ? 5000 : 0;
  const total = subtotal + serviceFee;

  return (
    <YStack gap="$3">
      <XStack justifyContent="space-between">
        <Text fontFamily="$heading" color="$gray10" fontWeight="700">
          Subtotal
        </Text>
        <Text fontFamily="$heading" color="$color" fontWeight="800">
          {formatMoney(subtotal)}
        </Text>
      </XStack>
      <XStack justifyContent="space-between">
        <Text fontFamily="$heading" color="$gray10" fontWeight="700">
          Service
        </Text>
        <Text fontFamily="$heading" color="$color" fontWeight="800">
          {formatMoney(serviceFee)}
        </Text>
      </XStack>
      <Separator />
      <XStack justifyContent="space-between">
        <Text fontFamily="$heading" color="$color" fontSize="$5" fontWeight="900">
          Total
        </Text>
        <Text fontFamily="$heading" color="$color" fontSize="$5" fontWeight="900">
          {formatMoney(total)}
        </Text>
      </XStack>
    </YStack>
  );
}
