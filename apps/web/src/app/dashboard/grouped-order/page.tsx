import { CONFIG } from 'src/global-config';

import { GroupedOrderListView } from 'src/sections/grouped-order/view/grouped-order-list-view';

import { PageRoleGuard } from 'src/auth/guard/page-role-guard';

// ----------------------------------------------------------------------

export const metadata = { title: `Guruhli buyurtmalar | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <PageRoleGuard allowedRoles={['super_admin', 'company_admin', 'kitchen_admin']}>
      <GroupedOrderListView />
    </PageRoleGuard>
  );
}
