import { CONFIG } from 'src/global-config';

import { MenuView } from 'src/sections/menu/view/menu-view';

import { PageRoleGuard } from 'src/auth/guard/page-role-guard';

// ----------------------------------------------------------------------

export const metadata = { title: `Menu Management | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <PageRoleGuard allowedRoles={['kitchen_admin']}>
      <MenuView />
    </PageRoleGuard>
  );
}
