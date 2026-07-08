import { useMutation } from '@tanstack/react-query';

import { registerForPushNotifications } from '@/lib/notifications';
import { usePreferencesStore } from '@/stores/preferences-store';

export function useNotifications() {
  const pushEnabled = usePreferencesStore((state) => state.pushEnabled);
  const telegramEnabled = usePreferencesStore((state) => state.telegramEnabled);
  const smsEnabled = usePreferencesStore((state) => state.smsEnabled);
  const quietHoursStart = usePreferencesStore((state) => state.quietHoursStart);
  const quietHoursEnd = usePreferencesStore((state) => state.quietHoursEnd);
  const setPushEnabled = usePreferencesStore((state) => state.setPushEnabled);
  const setTelegramEnabled = usePreferencesStore((state) => state.setTelegramEnabled);
  const setSmsEnabled = usePreferencesStore((state) => state.setSmsEnabled);

  const registerPush = useMutation({
    mutationFn: registerForPushNotifications,
  });

  return {
    pushEnabled,
    telegramEnabled,
    smsEnabled,
    quietHoursStart,
    quietHoursEnd,
    setPushEnabled,
    setTelegramEnabled,
    setSmsEnabled,
    registerPush,
  };
}
