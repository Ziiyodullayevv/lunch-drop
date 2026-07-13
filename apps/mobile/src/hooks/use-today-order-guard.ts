import { useCallback } from 'react';

import { useCustomAlert } from '@/components/ui/custom-alert';
import { getTodayDate } from '@/lib/api/kitchens';

const ORDER_DATE_TITLE = 'Buyurtma berib bo‘lmaydi';
const PAST_DATE_MESSAGE = "O‘tgan kun uchun buyurtma berib bo‘lmaydi.";
const CUTOFF_MESSAGE = "Bugungi buyurtma qabul qilish vaqti tugagan. Keyingi kun uchun buyurtma berishingiz mumkin.";

function isCutoffPassed(cutoffTime?: string): boolean {
  if (!cutoffTime) return false;
  const [hours, minutes] = cutoffTime.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return false;
  const tashkentNow = new Date(Date.now() + 5 * 60 * 60 * 1000);
  const currentMinutes = tashkentNow.getUTCHours() * 60 + tashkentNow.getUTCMinutes();
  return currentMinutes >= hours * 60 + minutes;
}

export function useTodayOrderGuard() {
  const { showAlert } = useCustomAlert();

  return useCallback(
    (targetDate?: string, cutoffTime?: string) => {
      if (!targetDate || targetDate < getTodayDate()) {
        showAlert(ORDER_DATE_TITLE, PAST_DATE_MESSAGE, [{ text: 'Tushunarli' }]);
        return false;
      }
      if (targetDate === getTodayDate() && isCutoffPassed(cutoffTime)) {
        showAlert(ORDER_DATE_TITLE, CUTOFF_MESSAGE, [{ text: 'Tushunarli' }]);
        return false;
      }
      return true;
    },
    [showAlert]
  );
}
