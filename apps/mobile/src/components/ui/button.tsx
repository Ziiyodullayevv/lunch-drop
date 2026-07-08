import { Button as TamaguiButton, Spinner, Text } from 'tamagui';
import type { ComponentProps } from 'react';

import { PRIMARY_ON } from '@/constants/theme';

import { PrimaryGradient } from './primary-gradient';

type TamaguiButtonProps = ComponentProps<typeof TamaguiButton>;

type AppButtonProps = Omit<TamaguiButtonProps, 'variant'> & {
  label: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
};

const variants = {
  primary: { backgroundColor: '#5BE49B', color: PRIMARY_ON, borderColor: '#5BE49B' },
  secondary: { backgroundColor: '$gray3', color: '$color', borderColor: '$gray5' },
  ghost: { backgroundColor: 'transparent', color: '$color', borderColor: 'transparent' },
  danger: { backgroundColor: '$red10', color: 'white', borderColor: '$red10' },
} as const;

export function AppButton({
  label,
  loading,
  variant = 'primary',
  disabled,
  icon,
  ...props
}: AppButtonProps) {
  const styles = variants[variant];
  const content = loading ? (
    <Spinner color={styles.color} />
  ) : (
    <>
      {icon}
      <Text fontFamily="$heading" color={styles.color} fontWeight="700" fontSize="$4">
        {label}
      </Text>
    </>
  );

  if (variant === 'primary') {
    return (
      <TamaguiButton
        minHeight={48}
        borderRadius="$4"
        borderWidth={0}
        paddingHorizontal={0}
        paddingVertical={0}
        disabled={disabled || loading}
        opacity={disabled ? 0.55 : 1}
        backgroundColor="transparent"
        borderColor="transparent"
        overflow="hidden"
        pressStyle={{ opacity: 0.82, scale: 0.99 }}
        {...props}
      >
        <PrimaryGradient
          style={{
            minHeight: 48,
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            paddingHorizontal: 16,
          }}
        >
          {content}
        </PrimaryGradient>
      </TamaguiButton>
    );
  }

  return (
    <TamaguiButton
      minHeight={48}
      borderRadius="$4"
      borderWidth={1}
      disabled={disabled || loading}
      opacity={disabled ? 0.55 : 1}
      backgroundColor={styles.backgroundColor}
      borderColor={styles.borderColor}
      icon={loading ? <Spinner color={styles.color} /> : icon}
      pressStyle={{ opacity: 0.82, scale: 0.99 }}
      {...props}>
      {loading ? null : (
        <Text fontFamily="$heading" color={styles.color} fontWeight="700" fontSize="$4">
          {label}
        </Text>
      )}
    </TamaguiButton>
  );
}
