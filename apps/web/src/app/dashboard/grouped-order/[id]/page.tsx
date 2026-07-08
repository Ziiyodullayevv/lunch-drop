import { CONFIG } from 'src/global-config';

import { GroupedOrderDetailView } from 'src/sections/grouped-order/view/grouped-order-detail-view';

import { PageRoleGuard } from 'src/auth/guard/page-role-guard';

// ----------------------------------------------------------------------

export const metadata = { title: `Guruhli buyurtma | Dashboard - ${CONFIG.appName}` };

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return (
    <PageRoleGuard allowedRoles={['super_admin', 'company_admin', 'kitchen_admin']}>
      <GroupedOrderDetailView id={id} />
    </PageRoleGuard>
  );
}
