import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { StyleProp, ViewStyle } from 'react-native';
import { YStack } from 'tamagui';

type HeaderBackButtonProps = {
  onPress?: () => void;
  color?: string;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
};

export function HeaderBackButton({
  onPress,
  color = '#1C1C1E',
  backgroundColor = 'transparent',
  style,
}: HeaderBackButtonProps) {
  return (
    <YStack
      width={38}
      height={38}
      borderRadius={19}
      backgroundColor={backgroundColor}
      alignItems="center"
      justifyContent="center"
      pressStyle={{ opacity: 0.65, scale: 0.96 }}
      style={style}
      onPress={onPress ?? (() => router.canGoBack() && router.back())}
    >
      <Ionicons name="chevron-back" size={26} color={color} />
    </YStack>
  );
}
