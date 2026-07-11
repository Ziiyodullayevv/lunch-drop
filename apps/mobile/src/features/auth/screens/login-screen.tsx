import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Keyboard, TouchableWithoutFeedback } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Input, Spinner, Text, XStack, YStack } from "tamagui";

import { useCustomAlert } from "@/components/ui/custom-alert";
import { useAuth } from "@/hooks/use-auth";
import { openPrivacyPolicy, openSupportBot } from "@/lib/support";
import { phoneSchema, type PhoneFormValues } from "@/lib/validation";
import { CountryCodeButton } from "../components/country-code-button";

const PROFILE_BUTTON_COLOR = "#1C252E";

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 9);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)} ${d.slice(2)}`;
  if (d.length <= 7) return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7)}`;
}

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { showAlert } = useCustomAlert();
  const auth = useAuth();
  const [phoneFocused, setPhoneFocused] = useState(false);

  const form = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "" },
    mode: "onChange",
  });

  async function handleSubmit(values: PhoneFormValues) {
    const fullPhone = `+998${values.phone.replace(/\D/g, "")}`;
    try {
      const { expiresIn, telegramUrl } = await auth.requestOtp.mutateAsync(fullPhone);
      router.push({
        pathname: "/verify-otp",
        params: { phone: fullPhone, expiresIn, telegramUrl: telegramUrl ?? '' },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Xatolik yuz berdi";
      showAlert("Xatolik", message);
    }
  }

  const isValid = form.formState.isValid;
  const isPending = auth.requestOtp.isPending;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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
            pressStyle={{ backgroundColor: "#E0E1E6", scale: 0.97 }}
            animation="quick"
            onPress={() => void openSupportBot()}
          >
            <Text
              fontFamily="$heading"
              fontSize="$3"
              fontWeight="600"
              color="#1C1C1E"
            >
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
          <Text
            fontFamily="$heading"
            fontSize={34}
            fontWeight="800"
            color="#1C1C1E"
            lineHeight={40}
            letterSpacing={-0.5}
          >
            Telefon raqamingiz
          </Text>
          <Text
            fontFamily="$body"
            fontSize="$4"
            color="#8E8E93"
            fontWeight="400"
          >
            Telefon raqamingizni kiriting
          </Text>
        </YStack>

        {/* Phone input */}
        <Controller
          control={form.control}
          name="phone"
          render={({ field, fieldState }) => (
            <YStack
              paddingHorizontal="$5"
              paddingTop="$6"
              gap="$2"
              animation="quick"
              enterStyle={{ opacity: 0, y: 18 }}
            >
              <XStack gap="$2" alignItems="center">
                <CountryCodeButton active={phoneFocused} />
                <Input
                  flex={1}
                  height={56}
                  borderRadius={14}
                  borderWidth={2}
                  borderColor={fieldState.error ? "#FF3B30" : "transparent"}
                  backgroundColor="#F0F0F3"
                  fontFamily="$body"
                  fontSize="$5"
                  fontWeight="600"
                  color="#1C1C1E"
                  placeholderTextColor="#8E8E93"
                  placeholder="90 123 45 67"
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  value={field.value}
                  onChangeText={(text) => field.onChange(formatPhone(text))}
                  onFocus={() => setPhoneFocused(true)}
                  onBlur={() => {
                    setPhoneFocused(false);
                    field.onBlur();
                  }}
                  focusStyle={{
                    backgroundColor: "#FFFFFF",
                    borderColor: PROFILE_BUTTON_COLOR,
                  }}
                  animation="quick"
                />
              </XStack>
              {fieldState.error && (
                <Text
                  fontFamily="$body"
                  fontSize="$2"
                  fontWeight="600"
                  color="#FF3B30"
                  paddingLeft="$1"
                >
                  {fieldState.error.message}
                </Text>
              )}
            </YStack>
          )}
        />

        <YStack flex={1} />

        {/* Continue button */}
        <YStack
          paddingHorizontal="$5"
          paddingBottom={Math.max(insets.bottom + 16, 36)}
          gap="$3"
          animation="quick"
          enterStyle={{ opacity: 0, y: 18 }}
        >
          <YStack
            height={56}
            borderRadius={20}
            backgroundColor={isValid ? PROFILE_BUTTON_COLOR : "#F0F0F3"}
            alignItems="center"
            justifyContent="center"
            overflow="hidden"
            pressStyle={isValid ? { scale: 0.98, opacity: 0.88 } : undefined}
            animation="quick"
            onPress={
              isValid && !isPending
                ? form.handleSubmit(handleSubmit)
                : undefined
            }
            disabled={!isValid || isPending}
          >
            {isPending ? (
              <Spinner color="#FFFFFF" />
            ) : (
              <Text
                fontFamily="$heading"
                fontSize={15}
                fontWeight="700"
                color={isValid ? "#FFFFFF" : "#8E8E93"}
              >
                Davom etish
              </Text>
            )}
          </YStack>
          <Text
            fontFamily="$body"
            fontSize="$3"
            color="#8E8E93"
            textAlign="center"
            onPress={() => void openPrivacyPolicy()}
          >
            Maxfiylik siyosati
          </Text>
        </YStack>
      </YStack>
    </TouchableWithoutFeedback>
  );
}
