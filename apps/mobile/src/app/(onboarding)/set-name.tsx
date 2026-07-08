import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Keyboard, TextInput, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spinner, Text, YStack } from 'tamagui';

import { updateMe } from '@/lib/api/users';
import { useAuthStore } from '@/stores/auth-store';

const PROFILE_BUTTON_COLOR = '#1C252E';

export default function SetNameScreen() {
  const insets = useSafeAreaInsets();
  const { allowEdit } = useLocalSearchParams<{ allowEdit?: string }>();
  const { user, accessToken, refreshToken, setSession } = useAuthStore();
  const [name, setName] = useState(user?.fullName ?? '');
  const [loading, setLoading] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);

  useEffect(() => {
    if (user?.fullName && allowEdit !== '1') {
      router.replace('/(onboarding)/companies');
    }
  }, [allowEdit, user?.fullName]);

  const isValid = name.trim().length >= 2;

  async function handleContinue() {
    if (!isValid || loading) return;
    setLoading(true);
    const trimmedName = name.trim();
    try {
      const updated = await updateMe({ name: trimmedName });
      if (user && accessToken && refreshToken) {
        setSession({
          accessToken,
          refreshToken,
          user: { ...user, fullName: updated.fullName || trimmedName },
        });
      }
    } catch {
      if (user && accessToken && refreshToken) {
        setSession({
          accessToken,
          refreshToken,
          user: { ...user, fullName: trimmedName },
        });
      }
    } finally {
      setLoading(false);
    }
    router.replace('/(onboarding)/companies');
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <YStack flex={1} backgroundColor="#FFFFFF" paddingTop={insets.top}>

      {/* Title */}
      <YStack
        paddingHorizontal="$5"
        paddingTop="$8"
        gap="$1"
        animation="quick"
        enterStyle={{ opacity: 0, y: 18 }}
      >
        <Text fontFamily="$heading" fontSize={34} fontWeight="800" color="#1C1C1E" lineHeight={40} letterSpacing={-0.5}>
          Ismingiz
        </Text>
        <Text fontFamily="$body" fontSize="$4" color="#8E8E93" fontWeight="400">
          {"To'liq ism va familiyangizni kiriting"}
        </Text>
      </YStack>

      {/* Input */}
      <YStack paddingHorizontal="$5" paddingTop="$6">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ism Familiya"
          placeholderTextColor="#8E8E93"
          autoFocus
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={handleContinue}
          onFocus={() => setNameFocused(true)}
          onBlur={() => setNameFocused(false)}
          style={{
            height: 56,
            borderRadius: 14,
            borderWidth: 2,
            borderColor: nameFocused ? PROFILE_BUTTON_COLOR : 'transparent',
            backgroundColor: nameFocused ? '#FFFFFF' : '#F0F0F3',
            fontSize: 17,
            fontWeight: '600',
            color: '#1C1C1E',
            paddingHorizontal: 16,
            fontFamily: 'NunitoSans_600SemiBold',
          }}
        />
      </YStack>

      <YStack flex={1} />

      {/* Continue button */}
      <YStack
        paddingHorizontal="$5"
        paddingBottom={Math.max(insets.bottom + 16, 36)}
        animation="quick"
        enterStyle={{ opacity: 0, y: 18 }}
      >
        <YStack
          height={56}
          borderRadius={20}
          backgroundColor={isValid ? PROFILE_BUTTON_COLOR : '#F0F0F3'}
          alignItems="center"
          justifyContent="center"
          overflow="hidden"
          pressStyle={isValid ? { scale: 0.98, opacity: 0.88 } : undefined}
          animation="quick"
          onPress={handleContinue}
          disabled={!isValid || loading}
        >
          {loading ? (
            <Spinner color="#FFFFFF" />
          ) : (
            <Text fontFamily="$heading" fontSize={15} fontWeight="700" color={isValid ? '#FFFFFF' : '#8E8E93'}>
              Davom etish
            </Text>
          )}
        </YStack>
      </YStack>
      </YStack>
    </TouchableWithoutFeedback>
  );
}
