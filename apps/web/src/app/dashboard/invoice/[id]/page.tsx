import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';
import { _invoices } from 'src/_mock/_invoice';

import { InvoiceDetailsView } from 'src/sections/invoice/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Invoice details | Dashboard - ${CONFIG.appName}` };

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;

  const currentInvoice = _invoices.find((invoice) => invoice.id === id);

  return <InvoiceDetailsView invoice={currentInvoice} />;
}

export const dynamic = 'force-dynamic';
