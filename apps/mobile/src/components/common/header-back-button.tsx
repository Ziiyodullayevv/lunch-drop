import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

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
    <Pressable
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Orqaga"
      onPress={onPress ?? (() => router.canGoBack() && router.back())}
      style={({ pressed }) => [
        {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20,
          opacity: pressed ? 0.65 : 1,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
        style,
      ]}
    >
      <Ionicons name="chevron-back" size={26} color={color} />
    </Pressable>
  );
}
