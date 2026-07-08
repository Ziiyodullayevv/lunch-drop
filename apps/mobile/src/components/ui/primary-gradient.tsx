import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

type PrimaryGradientProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryGradient({ children, style }: PrimaryGradientProps) {
  return (
    <LinearGradient
      colors={['#00A76F', '#5BE49B']}
      start={{ x: 0.5, y: 1 }}
      end={{ x: 0.5, y: 0 }}
      style={style}
    >
      {children}
    </LinearGradient>
  );
}
