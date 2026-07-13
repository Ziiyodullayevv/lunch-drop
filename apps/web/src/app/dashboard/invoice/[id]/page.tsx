import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { InvoiceDetailsView } from 'src/sections/invoice/view';

import { PageRoleGuard } from 'src/auth/guard/page-role-guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Invoice details | Dashboard - ${CONFIG.appName}` };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
};

export default async function Page({ params, searchParams }: Props) {
  const { id } = await params;
  const { month } = await searchParams;

  return (
    <PageRoleGuard allowedRoles={['company_admin', 'super_admin']}>
      <InvoiceDetailsView employeeId={id} month={month} />
    </PageRoleGuard>
  );
}

export const dynamic = 'force-dynamic';
