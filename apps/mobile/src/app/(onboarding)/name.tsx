import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { TextInput, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, XStack, YStack } from 'tamagui';

import { useCustomAlert } from '@/components/ui/custom-alert';
import { openSupportBot } from '@/lib/support';

export default function NameScreen() {
  const insets = useSafeAreaInsets();
  const { showAlert } = useCustomAlert();
  const [name, setName] = useState('');
  const inputRef = useRef<TextInput>(null);

  const handleContinue = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      showAlert('Ism kiritilmadi', 'Davom etish uchun ismingizni kiriting.');
      return;
    }
    router.push({
      pathname: '/(onboarding)/companies',
      params: { userName: trimmed },
    });
  };

  const isValid = name.trim().length > 0;

  return (
    <YStack flex={1} backgroundColor="#FFFFFF" paddingTop={insets.top}>

      {/* Header */}
      <XStack
        paddingHorizontal="$4"
        paddingVertical="$2"
        alignItems="center"
        justifyContent="flex-end"
      >
        <YStack
          paddingHorizontal="$3"
          paddingVertical="$2"
          borderRadius={20}
          backgroundColor="#F0F0F3"
          pressStyle={{ backgroundColor: '#E0E1E6', scale: 0.97 }}
          animation="quick"
          onPress={() => void openSupportBot()}
        >
          <Text fontFamily="$heading" fontSize="$3" fontWeight="600" color="#1C1C1E">
            Yordam
          </Text>
        </YStack>
      </XStack>

      {/* Title */}
      <YStack
        paddingHorizontal="$5"
        paddingTop="$6"
        gap="$1"
        animation="quick"
        enterStyle={{ opacity: 0, y: 18 }}
      >
        <Text fontFamily="$heading" fontSize={34} fontWeight="800" color="#1C1C1E" lineHeight={40} letterSpacing={-0.5}>
          Ismingiz
        </Text>
        <Text fontFamily="$body" fontSize="$4" color="#8E8E93" fontWeight="400">
          Sizni qanday chaqirishimiz kerak?
        </Text>
      </YStack>

      {/* Input */}
      <YStack paddingHorizontal={20} paddingTop={32} gap={12}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => inputRef.current?.focus()}
          style={{
            backgroundColor: '#F0F0F3',
            borderRadius: 16,
            paddingHorizontal: 18,
            paddingVertical: 18,
          }}
        >
          <TextInput
            ref={inputRef}
            value={name}
            onChangeText={setName}
            placeholder="Masalan: Akbar"
            placeholderTextColor="#C7C7CC"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleContinue}
            style={{
              fontSize: 18,
              fontWeight: '600',
              fontFamily: 'NunitoSans_600SemiBold',
              color: '#1C1C1E',
            }}
          />
        </TouchableOpacity>

        {/* Continue button */}
        <TouchableOpacity
          onPress={handleContinue}
          activeOpacity={0.85}
          disabled={!isValid}
          style={{
            height: 56,
            backgroundColor: isValid ? '#1C1C1E' : '#E5E5EA',
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 8,
          }}
        >
          <Text fontFamily="$heading"
            fontSize={16}
            fontWeight="700"
            color={isValid ? '#FFFFFF' : '#C7C7CC'}
          >
            Davom etish
          </Text>
        </TouchableOpacity>
      </YStack>
    </YStack>
  );
}
