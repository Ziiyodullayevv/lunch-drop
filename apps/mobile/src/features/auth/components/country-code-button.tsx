import { Pressable } from 'react-native';
import { Image } from 'expo-image';
import { XStack } from 'tamagui';

const UZ_FLAG = require('@/assets/images/flags/flag-for-flag-uzbekistan.svg');

interface CountryCodeButtonProps {
  active?: boolean;
  onPress?: () => void;
}

export function CountryCodeButton({ active = false, onPress }: CountryCodeButtonProps) {
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      {({ pressed }) => (
        <XStack
          width={64}
          height={56}
          borderRadius={14}
          borderWidth={2}
          borderColor={active ? '#1C252E' : 'transparent'}
          backgroundColor={active ? '#FFFFFF' : pressed ? '#E0E1E6' : '#F0F0F3'}
          alignItems="center"
          justifyContent="center"
          animation="quick"
        >
          <Image
            source={UZ_FLAG}
            style={{ width: 32, height: 32, borderRadius: 4 }}
            contentFit="contain"
          />
        </XStack>
      )}
    </Pressable>
  );
}
