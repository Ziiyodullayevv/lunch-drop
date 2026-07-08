'use client';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { UserCreateEditForm } from '../user-create-edit-form';

// ----------------------------------------------------------------------

type Props = { id: string };

export function UserEditView({ id }: Props) {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Foydalanuvchini tahrirlash"
        backHref={paths.dashboard.user.list}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Foydalanuvchilar', href: paths.dashboard.user.list },
          { name: 'Tahrirlash' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <UserCreateEditForm userId={id} />
    </DashboardContent>
  );
}
