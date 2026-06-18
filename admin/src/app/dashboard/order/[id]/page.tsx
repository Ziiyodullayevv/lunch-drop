import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { OrderDetailsView } from 'src/sections/order/view';

import { PageRoleGuard } from 'src/auth/guard/page-role-guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Buyurtma tafsilotlari | Dashboard - ${CONFIG.appName}` };

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;
  return (
    <PageRoleGuard allowedRoles={['super_admin', 'company_admin', 'kitchen_admin', 'employee']}>
      <OrderDetailsView id={id} />
    </PageRoleGuard>
  );
}

export const dynamic = 'force-dynamic';
