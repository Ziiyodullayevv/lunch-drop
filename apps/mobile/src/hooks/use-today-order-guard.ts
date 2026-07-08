import { useCallback } from 'react';

import { useCustomAlert } from '@/components/ui/custom-alert';
import { getTodayDate } from '@/lib/api/kitchens';

const NON_TODAY_ORDER_TITLE = 'Bugun uchun';
const NON_TODAY_ORDER_MESSAGE =
  "Buyurtma faqat bugungi kun uchun beriladi. O'tib ketgan yoki keyingi kun uchun buyurtma berib bo'lmaydi.";

export function useTodayOrderGuard() {
  const { showAlert } = useCustomAlert();

  return useCallback(
    (targetDate?: string) => {
      if (!targetDate || targetDate === getTodayDate()) return true;

      showAlert(NON_TODAY_ORDER_TITLE, NON_TODAY_ORDER_MESSAGE, [{ text: 'Tushunarli' }]);
      return false;
    },
    [showAlert]
  );
}
