import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { HeaderBackButton } from '@/components/common/header-back-button';
import { useAuth } from '@/hooks/use-auth';
import { openSupportBot } from '@/lib/support';
import { otpSchema, type OtpFormValues } from '@/lib/validation';
import { OtpBoxInput } from '../components/otp-box-input';
import { useCountdown } from '../hooks/use-countdown';

export function VerifyOtpScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ phone?: string; expiresIn?: string }>();
  const auth = useAuth();
  const expiresIn = Number(params.expiresIn ?? 60);
  const countdown = useCountdown(expiresIn);

  const phone = params.phone ?? '';

  const form = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: '' },
    mode: 'onChange',
  });

  const handleVerify = useCallback(
    async (values: OtpFormValues) => {
      const session = await auth.verifyOtp.mutateAsync({ phone, code: values.code });
      if (session?.user?.branchId) {
        router.replace('/(tabs)/home');
      } else if (!session?.user?.fullName) {
        router.replace('/(onboarding)/set-name');
      } else {
        router.replace('/(onboarding)/companies');
      }
    },
    [auth.verifyOtp, phone],
  );

  const handleComplete = useCallback(
    (code: string) => {
      form.setValue('code', code, { shouldValidate: true });
      form.handleSubmit(handleVerify)();
    },
    [form, handleVerify],
  );

  const maskedPhone = phone
    ? phone.slice(0, -4).replace(/\d(?=\d{2})/g, '*') + phone.slice(-4)
    : '';

  return (
    <YStack flex={1} backgroundColor="#FFFFFF" paddingTop={insets.top}>

      {/* Header */}
      <XStack
        paddingHorizontal="$4"
        paddingVertical="$2"
        alignItems="center"
        justifyContent="space-between"
      >
        <HeaderBackButton />

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
          Tasdiqlash
        </Text>
        <Text fontFamily="$body" fontSize="$4" color="#8E8E93" fontWeight="400" lineHeight={22}>
          Yuborilgan 6 xonali kodni kiriting:{' '}
          <Text fontFamily="$body" fontSize="$4" color="#8E8E93" fontWeight="600">
            {maskedPhone || phone}
          </Text>
        </Text>
      </YStack>

      {/* OTP boxes */}
      <YStack paddingTop="$8" animation="quick" enterStyle={{ opacity: 0, y: 18 }}>
        <Controller
          control={form.control}
          name="code"
          render={({ field }) => (
            <OtpBoxInput
              value={field.value}
              onChange={(v) => form.setValue('code', v, { shouldValidate: true })}
              onComplete={handleComplete}
              length={6}
              autoFocus
            />
          )}
        />
        {form.formState.errors.code && (
          <Text
            fontFamily="$body"
            textAlign="center"
            marginTop="$3"
            fontSize="$2"
            fontWeight="600"
            color="#FF3B30"
          >
            {form.formState.errors.code.message}
          </Text>
        )}
      </YStack>

      <YStack flex={1} />

      {/* Resend + error */}
      <YStack
        paddingBottom={Math.max(insets.bottom + 24, 48)}
        paddingHorizontal="$5"
        alignItems="center"
        gap="$4"
      >
        {auth.verifyOtp.isPending && (
          <Spinner color="#1C1C1E" />
        )}

        {countdown.isDone ? (
          <YStack
            onPress={countdown.reset}
            pressStyle={{ opacity: 0.7 }}
            animation="quick"
          >
            <Text fontFamily="$heading" fontSize="$4" fontWeight="700" color="#1C1C1E">
              Kodni qayta yuborish
            </Text>
          </YStack>
        ) : (
          <Text fontFamily="$body" fontSize="$4" color="#8E8E93">
            Kodni qayta yuborish uchun:{' '}
            <Text fontFamily="$body" fontSize="$4" color="#8E8E93" fontWeight="600">
              {countdown.formatted}
            </Text>
          </Text>
        )}

        {auth.verifyOtp.isError && (
          <XStack
            backgroundColor="#FFF0EE"
            borderRadius={12}
            paddingHorizontal="$4"
            paddingVertical="$3"
            borderWidth={1}
            borderColor="#FFD5D0"
            alignSelf="stretch"
          >
            <Text fontFamily="$body" fontSize="$3" color="#FF3B30" fontWeight="500" textAlign="center" flex={1}>
              {"Kod noto'g'ri. Qaytadan urinib ko'ring."}
            </Text>
          </XStack>
        )}
      </YStack>
    </YStack>
  );
}
