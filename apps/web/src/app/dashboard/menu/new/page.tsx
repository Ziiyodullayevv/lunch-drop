import { CONFIG } from 'src/global-config';

import { MenuCreateView } from 'src/sections/menu/view/menu-create-view';

import { PageRoleGuard } from 'src/auth/guard/page-role-guard';

// ----------------------------------------------------------------------

export const metadata = { title: `Taom qo'shish | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <PageRoleGuard allowedRoles={['kitchen_admin']}>
      <MenuCreateView />
    </PageRoleGuard>
  );
}
