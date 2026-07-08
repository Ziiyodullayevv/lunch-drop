import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { storage } from '@/lib/storage';
import type { NotificationPreferences } from '@/types/domain';

type PreferencesState = NotificationPreferences & {
  setPushEnabled: (value: boolean) => void;
  setTelegramEnabled: (value: boolean) => void;
  setSmsEnabled: (value: boolean) => void;
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      telegramEnabled: true,
      pushEnabled: true,
      smsEnabled: true,
      emailEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      setPushEnabled: (pushEnabled) => set({ pushEnabled }),
      setTelegramEnabled: (telegramEnabled) => set({ telegramEnabled }),
      setSmsEnabled: (smsEnabled) => set({ smsEnabled }),
    }),
    {
      name: 'notification-preferences',
      storage: createJSONStorage(() => storage),
    },
  ),
);
