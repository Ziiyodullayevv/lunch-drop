import type { Metadata } from 'next';

import { _jobs } from 'src/_mock/_job';
import { CONFIG } from 'src/global-config';

import { JobEditView } from 'src/sections/job/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Job edit | Dashboard - ${CONFIG.appName}` };

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;

  const currentJob = _jobs.find((job) => job.id === id);

  return <JobEditView job={currentJob} />;
}

export const dynamic = 'force-dynamic';
