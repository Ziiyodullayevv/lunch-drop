import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import type { ViewStyle } from 'react-native';

type Props = { style?: ViewStyle };

export function SkeletonBox({ style }: Props) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.35, { duration: 800 }), -1, true);
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[{ backgroundColor: '#E5E5EA', borderRadius: 8 }, animStyle, style]} />
  );
}
