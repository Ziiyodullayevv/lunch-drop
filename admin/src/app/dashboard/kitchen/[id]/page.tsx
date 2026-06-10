import { CONFIG } from 'src/global-config';

import { KitchenDetailView } from 'src/sections/kitchen/view/kitchen-detail-view';

import { PageRoleGuard } from 'src/auth/guard/page-role-guard';

export const metadata = { title: `Kitchen | Dashboard - ${CONFIG.appName}` };

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return (
    <PageRoleGuard allowedRoles={['super_admin', 'company_admin', 'kitchen_admin']}>
      <KitchenDetailView id={id} />
    </PageRoleGuard>
  );
}
