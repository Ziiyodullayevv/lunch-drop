import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';
import { getPost } from 'src/actions/blog-ssr';

import { PostEditView } from 'src/sections/blog/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Post edit | Dashboard - ${CONFIG.appName}` };

type Props = {
  params: Promise<{ title: string }>;
};

export default async function Page({ params }: Props) {
  const { title } = await params;

  const { post } = await getPost(title);

  return <PostEditView post={post} />;
}

export const dynamic = 'force-dynamic';
