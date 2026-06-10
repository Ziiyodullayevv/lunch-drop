import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { OrderDetailsView } from 'src/sections/order/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Buyurtma tafsilotlari | Dashboard - ${CONFIG.appName}` };

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <OrderDetailsView id={id} />;
}

export const dynamic = 'force-dynamic';
