import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';
import { getProduct } from 'src/actions/product-ssr';

import { ProductEditView } from 'src/sections/product/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Product edit | Dashboard - ${CONFIG.appName}` };

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;

  const { product } = await getProduct(id);

  return <ProductEditView product={product} />;
}

export const dynamic = 'force-dynamic';
