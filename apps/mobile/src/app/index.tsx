import { Redirect } from 'expo-router';

import { LoadingState, Screen } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';

export default function IndexScreen() {
  const auth = useAuth();

  if (!auth.hasHydrated) {
    return (
      <Screen scroll={false}>
        <LoadingState />
      </Screen>
    );
  }

  if (!auth.isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (!auth.user?.branchId) {
    return <Redirect href={auth.user?.fullName ? '/(onboarding)/companies' : '/(onboarding)/set-name'} />;
  }

  return <Redirect href="/(tabs)/home" />;
}
