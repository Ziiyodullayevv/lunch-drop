import { CONFIG } from 'src/global-config';

import { BranchCreateView } from 'src/sections/branch/view/branch-create-view';

import { PageRoleGuard } from 'src/auth/guard/page-role-guard';

// ----------------------------------------------------------------------

export const metadata = { title: `New Branch | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <PageRoleGuard allowedRoles={['super_admin', 'company_admin']}>
      <BranchCreateView />
    </PageRoleGuard>
  );
}
