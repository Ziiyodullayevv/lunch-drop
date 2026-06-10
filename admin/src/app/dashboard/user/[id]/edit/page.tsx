import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { UserEditView } from 'src/sections/user/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `User edit | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <UserEditView />;
}

export const dynamic = 'force-dynamic';
