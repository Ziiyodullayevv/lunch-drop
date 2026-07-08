import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { YStack } from 'tamagui';
import { zodResolver } from '@hookform/resolvers/zod';

import { AppButton, AppCard, AppInput, Screen } from '@/components/ui';
import { inviteCodeSchema, type InviteCodeFormValues } from '@/lib/validation';

export default function InviteCodeScreen() {
  const form = useForm<InviteCodeFormValues>({
    resolver: zodResolver(inviteCodeSchema),
    defaultValues: { code: '' },
  });

  return (
    <Screen title="Taklif kodi" subtitle="Filialga ulanish" scroll={false}>
      <YStack flex={1} justifyContent="center">
        <AppCard title="Kompaniya kodi" subtitle="Admin bergan invite kodni kiriting.">
          <YStack gap="$4">
            <Controller
              control={form.control}
              name="code"
              render={({ field, fieldState }) => (
                <AppInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="LD-2026"
                  autoCapitalize="characters"
                  error={fieldState.error?.message}
                />
              )}
            />
            <AppButton label="Ulanish" onPress={form.handleSubmit(() => router.replace('/home'))} />
          </YStack>
        </AppCard>
      </YStack>
    </Screen>
  );
}
