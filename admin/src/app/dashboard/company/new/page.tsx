import { CONFIG } from 'src/global-config';

import { CompanyCreateView } from 'src/sections/company/view/company-create-view';

import { PageRoleGuard } from 'src/auth/guard/page-role-guard';

// ----------------------------------------------------------------------

export const metadata = { title: `New Company | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <PageRoleGuard allowedRoles={['super_admin']}>
      <CompanyCreateView />
    </PageRoleGuard>
  );
}
