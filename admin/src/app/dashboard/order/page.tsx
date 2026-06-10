import { CONFIG } from 'src/global-config';

import { OrderPageView } from 'src/sections/order/view/order-page-view';

import { PageRoleGuard } from 'src/auth/guard/page-role-guard';

// ----------------------------------------------------------------------

export const metadata = { title: `Buyurtmalar | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <PageRoleGuard allowedRoles={['super_admin', 'company_admin', 'kitchen_admin', 'employee']}>
      <OrderPageView />
    </PageRoleGuard>
  );
}
