import { useMutation } from '@tanstack/react-query';

import { logout, requestOtp, verifyOtp } from '@/lib/api/auth';
import { registerForPushNotifications } from '@/lib/notifications';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore } from '@/stores/cart-store';

export function useAuth() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  const requestOtpMutation = useMutation({
    mutationFn: requestOtp,
  });

  const verifyOtpMutation = useMutation({
    mutationFn: ({ phone, code }: { phone: string; code: string }) => verifyOtp(phone, code),
    onSuccess: (session) => {
      useCartStore.getState().clear();
      setSession(session);
      registerForPushNotifications().catch(() => {});
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => logout(refreshToken),
    onSettled: () => {
      clearSession();
      useCartStore.getState().clear();
    },
  });

  return {
    accessToken,
    user,
    hasHydrated,
    isAuthenticated: Boolean(accessToken && user),
    requestOtp: requestOtpMutation,
    verifyOtp: verifyOtpMutation,
    logout: logoutMutation,
  };
}
