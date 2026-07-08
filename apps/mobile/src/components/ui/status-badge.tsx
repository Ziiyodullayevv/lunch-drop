import { Text, XStack } from 'tamagui';

type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
};

const tones = {
  neutral: { backgroundColor: '$gray3', color: '$gray11' },
  success: { backgroundColor: '$green3', color: '$green11' },
  warning: { backgroundColor: '$yellow3', color: '$yellow11' },
  danger: { backgroundColor: '$red3', color: '$red11' },
  info: { backgroundColor: '$blue3', color: '$blue11' },
} as const;

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  const styles = tones[tone];

  return (
    <XStack
      alignItems="center"
      alignSelf="flex-start"
      borderRadius="$10"
      paddingHorizontal="$3"
      paddingVertical="$1.5"
      backgroundColor={styles.backgroundColor}>
      <Text fontFamily="$heading" color={styles.color} fontSize="$2" fontWeight="800">
        {label}
      </Text>
    </XStack>
  );
}
