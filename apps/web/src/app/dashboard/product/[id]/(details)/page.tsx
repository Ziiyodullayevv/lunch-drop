import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';
import { getProduct } from 'src/actions/product-ssr';

import { ProductDetailsView } from 'src/sections/product/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Product details | Dashboard - ${CONFIG.appName}` };

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;

  const { product } = await getProduct(id);

  return <ProductDetailsView product={product} />;
}

export const dynamic = 'force-dynamic';
