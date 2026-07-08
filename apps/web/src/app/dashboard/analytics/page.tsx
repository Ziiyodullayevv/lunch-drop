import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { OverviewAnalyticsView } from 'src/sections/overview/analytics/view';

import { PageRoleGuard } from 'src/auth/guard/page-role-guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Analytics | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <PageRoleGuard allowedRoles={['super_admin']}>
      <OverviewAnalyticsView />
    </PageRoleGuard>
  );
}
