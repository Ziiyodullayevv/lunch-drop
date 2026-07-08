import { CONFIG } from 'src/global-config';

import { KitchenListView } from 'src/sections/kitchen/view/kitchen-list-view';

import { PageRoleGuard } from 'src/auth/guard/page-role-guard';

// ----------------------------------------------------------------------

export const metadata = { title: `Kitchens | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <PageRoleGuard allowedRoles={['super_admin', 'company_admin']}>
      <KitchenListView />
    </PageRoleGuard>
  );
}
