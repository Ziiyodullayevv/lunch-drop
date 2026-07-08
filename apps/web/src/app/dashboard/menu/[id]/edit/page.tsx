import { CONFIG } from 'src/global-config';

import { MenuEditView } from 'src/sections/menu/view/menu-edit-view';

import { PageRoleGuard } from 'src/auth/guard/page-role-guard';

// ----------------------------------------------------------------------

export const metadata = { title: `Ovqatni tahrirlash | Dashboard - ${CONFIG.appName}` };

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;

  return (
    <PageRoleGuard allowedRoles={['kitchen_admin']}>
      <MenuEditView id={id} />
    </PageRoleGuard>
  );
}
