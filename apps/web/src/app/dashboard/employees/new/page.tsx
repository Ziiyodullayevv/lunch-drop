import { CONFIG } from 'src/global-config';

import { EmployeeCreateView } from 'src/sections/employees/view/employee-create-view';

import { PageRoleGuard } from 'src/auth/guard/page-role-guard';

export const metadata = { title: `Yangi xodim | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <PageRoleGuard allowedRoles={['company_admin']}>
      <EmployeeCreateView />
    </PageRoleGuard>
  );
}
