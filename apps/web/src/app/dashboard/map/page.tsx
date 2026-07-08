import { CONFIG } from 'src/global-config';

import { MapOverviewView } from 'src/sections/map/view/map-overview-view';

import { PageRoleGuard } from 'src/auth/guard/page-role-guard';

export const metadata = { title: `Xarita | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <PageRoleGuard allowedRoles={['super_admin', 'company_admin', 'kitchen_admin']}>
      <MapOverviewView />
    </PageRoleGuard>
  );
}
