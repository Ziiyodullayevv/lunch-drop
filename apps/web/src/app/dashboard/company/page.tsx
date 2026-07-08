import { CONFIG } from 'src/global-config';

import { CompanyBranchesView } from 'src/sections/company/view/company-branches-view';

import { PageRoleGuard } from 'src/auth/guard/page-role-guard';

// ----------------------------------------------------------------------

export const metadata = { title: `Kompaniyalar | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <PageRoleGuard allowedRoles={['super_admin']}>
      <CompanyBranchesView />
    </PageRoleGuard>
  );
}
