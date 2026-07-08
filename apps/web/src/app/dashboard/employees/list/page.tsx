import { CONFIG } from 'src/global-config';

import { EmployeesListView } from 'src/sections/employees/view/employees-list-view';

import { PageRoleGuard } from 'src/auth/guard/page-role-guard';

export const metadata = { title: `Xodimlar | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <PageRoleGuard allowedRoles={['company_admin']}>
      <EmployeesListView />
    </PageRoleGuard>
  );
}
