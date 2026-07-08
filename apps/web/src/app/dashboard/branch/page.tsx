import { CONFIG } from 'src/global-config';

import { BranchListView } from 'src/sections/branch/view/branch-list-view';

import { PageRoleGuard } from 'src/auth/guard/page-role-guard';

// ----------------------------------------------------------------------

export const metadata = { title: `Branches | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <PageRoleGuard allowedRoles={['super_admin', 'company_admin']}>
      <BranchListView />
    </PageRoleGuard>
  );
}
