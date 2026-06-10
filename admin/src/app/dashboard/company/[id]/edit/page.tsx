import { CONFIG } from 'src/global-config';

import { CompanyEditView } from 'src/sections/company/view/company-edit-view';

import { PageRoleGuard } from 'src/auth/guard/page-role-guard';

export const metadata = { title: `Kompaniyani tahrirlash | Dashboard - ${CONFIG.appName}` };

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return (
    <PageRoleGuard allowedRoles={['super_admin']}>
      <CompanyEditView id={id} />
    </PageRoleGuard>
  );
}
