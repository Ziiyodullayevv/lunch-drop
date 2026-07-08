import { useAuthStore } from '@/stores/auth-store';

export function useCurrentUser() {
  const user = useAuthStore((state) => state.user);

  return {
    user,
    isLoading: false,
  };
}
