import { CONFIG } from 'src/global-config';

import { KitchenSettingsView } from 'src/sections/kitchen/view/kitchen-settings-view';

import { PageRoleGuard } from 'src/auth/guard/page-role-guard';

// ----------------------------------------------------------------------

export const metadata = { title: `Oshxona sozlamalari | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <PageRoleGuard allowedRoles={['kitchen_admin']}>
      <KitchenSettingsView />
    </PageRoleGuard>
  );
}
