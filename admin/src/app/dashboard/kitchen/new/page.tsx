import { CONFIG } from 'src/global-config';

import { KitchenCreateView } from 'src/sections/kitchen/view/kitchen-create-view';

import { PageRoleGuard } from 'src/auth/guard/page-role-guard';

// ----------------------------------------------------------------------

export const metadata = { title: `New Kitchen | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <PageRoleGuard allowedRoles={['super_admin']}>
      <KitchenCreateView />
    </PageRoleGuard>
  );
}
