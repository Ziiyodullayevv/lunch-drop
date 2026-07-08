import type { Metadata } from 'next';

import { _tours } from 'src/_mock/_tour';
import { CONFIG } from 'src/global-config';

import { TourEditView } from 'src/sections/tour/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Tour edit | Dashboard - ${CONFIG.appName}` };

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;

  const currentTour = _tours.find((tour) => tour.id === id);

  return <TourEditView tour={currentTour} />;
}

export const dynamic = 'force-dynamic';
