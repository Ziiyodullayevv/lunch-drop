import { CONFIG } from 'src/global-config';

import { KitchenSettlementsView } from 'src/sections/kitchen/view/kitchen-settlements-view';

import { PageRoleGuard } from 'src/auth/guard/page-role-guard';

export const metadata = { title: `Hisob-kitoblar | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <PageRoleGuard allowedRoles={['kitchen_admin']}>
      <KitchenSettlementsView />
    </PageRoleGuard>
  );
}
