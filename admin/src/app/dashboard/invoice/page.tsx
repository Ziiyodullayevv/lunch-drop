import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { InvoiceListView } from 'src/sections/invoice/view';

import { PageRoleGuard } from 'src/auth/guard/page-role-guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Hisob-fakturalar | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <PageRoleGuard allowedRoles={['company_admin']}>
      <InvoiceListView />
    </PageRoleGuard>
  );
}
