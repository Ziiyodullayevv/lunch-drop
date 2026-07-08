'use client';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { EmployeeCreateForm } from '../employee-create-form';

export function EmployeeCreateView() {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Yangi xodim"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Xodimlar', href: paths.dashboard.employee.list },
          { name: 'Yangi xodim' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />
      <EmployeeCreateForm />
    </DashboardContent>
  );
}
