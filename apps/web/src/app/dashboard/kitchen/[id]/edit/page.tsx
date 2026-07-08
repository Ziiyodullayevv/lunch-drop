import { CONFIG } from 'src/global-config';

import { KitchenEditView } from 'src/sections/kitchen/view/kitchen-edit-view';

import { PageRoleGuard } from 'src/auth/guard/page-role-guard';

export const metadata = { title: `Oshxonani tahrirlash | Dashboard - ${CONFIG.appName}` };

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;

  return (
    <PageRoleGuard allowedRoles={['super_admin']}>
      <KitchenEditView id={id} />
    </PageRoleGuard>
  );
}
