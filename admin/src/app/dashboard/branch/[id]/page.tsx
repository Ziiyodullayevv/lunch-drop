import { CONFIG } from 'src/global-config';

import { BranchDetailView } from 'src/sections/branch/view/branch-detail-view';

import { PageRoleGuard } from 'src/auth/guard/page-role-guard';

// ----------------------------------------------------------------------

export const metadata = { title: `Branch | Dashboard - ${CONFIG.appName}` };

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;

  return (
    <PageRoleGuard allowedRoles={['super_admin', 'company_admin']}>
      <BranchDetailView id={id} />
    </PageRoleGuard>
  );
}
