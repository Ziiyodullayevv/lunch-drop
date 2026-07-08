import { Image } from 'expo-image';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { Spinner, Text, YStack } from 'tamagui';

// ----------------------------------------------------------------------

type StateViewProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

export function LoadingState({ title }: StateViewProps) {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" paddingVertical={48}>
      <Spinner color="#00A76F" size="large" />
      {title ? (
        <Text marginTop={12} fontSize={14} color="#8E8E93" fontWeight="600">
          {title}
        </Text>
      ) : null}
    </YStack>
  );
}

export function ErrorState({ title = 'Xatolik yuz berdi', description = "Qayta urinib ko'ring." }: StateViewProps) {
  return (
    <YStack flex={1} alignItems="center" justifyContent="flex-start" paddingTop={40} gap={12}>
      <Animated.View entering={FadeInDown.duration(600).easing(Easing.out(Easing.cubic))}>
        <Image
          source={require('@/assets/images/home/error.png')}
          style={{ width: 224, height: 224 }}
          contentFit="contain"
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(150).duration(600).easing(Easing.out(Easing.cubic))}>
        <Text fontFamily="$heading" fontSize={18} fontWeight="700" color="#1C1C1E" textAlign="center">
          {title}
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(600).easing(Easing.out(Easing.cubic))}>
        <Text fontSize={14} color="#8E8E93" textAlign="center">
          {description}
        </Text>
      </Animated.View>
    </YStack>
  );
}
