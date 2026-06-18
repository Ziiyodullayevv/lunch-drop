import { CONFIG } from 'src/global-config';

import { MenuDetailView } from 'src/sections/menu/view/menu-detail-view';

import { PageRoleGuard } from 'src/auth/guard/page-role-guard';

// ----------------------------------------------------------------------

export const metadata = { title: `Ovqat | Dashboard - ${CONFIG.appName}` };

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;

  return (
    <PageRoleGuard allowedRoles={['kitchen_admin']}>
      <MenuDetailView id={id} />
    </PageRoleGuard>
  );
}
