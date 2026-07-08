'use client';

import { useEffect } from 'react';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { useAuthContext } from '../hooks';

// ----------------------------------------------------------------------

type Props = {
  allowedRoles: string[];
  children: React.ReactNode;
};

export function PageRoleGuard({ allowedRoles, children }: Props) {
  const { user, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && !allowedRoles.includes(user.role)) {
      router.replace(paths.dashboard.root);
    }
  }, [loading, user, allowedRoles, router]);

  if (loading || !user) return null;
  if (!allowedRoles.includes(user.role)) return null;

  return <>{children}</>;
}
