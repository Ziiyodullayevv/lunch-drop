import { CONFIG } from 'src/global-config';

import { CategoriesView } from 'src/sections/menu/view/categories-view';

import { PageRoleGuard } from 'src/auth/guard/page-role-guard';

// ----------------------------------------------------------------------

export const metadata = { title: `Menu Categories | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <PageRoleGuard allowedRoles={['super_admin', 'company_admin']}>
      <CategoriesView />
    </PageRoleGuard>
  );
}
