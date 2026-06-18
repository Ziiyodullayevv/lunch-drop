'use client';

import type { DashboardContentProps } from 'src/layouts/dashboard';

import { removeLastSlash } from 'minimal-shared/utils';

import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

import { paths } from 'src/routes/paths';
import { usePathname } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

const NAV_ITEMS = [
  {
    label: 'General',
    icon: <Iconify width={24} icon="solar:user-id-bold" />,
    href: paths.dashboard.user.account,
  },
  {
    label: 'Billing',
    icon: <Iconify width={24} icon="solar:bill-list-bold" />,
    href: `${paths.dashboard.user.account}/billing`,
  },
  {
    label: 'Notifications',
    icon: <Iconify width={24} icon="solar:bell-bing-bold" />,
    href: `${paths.dashboard.user.account}/notifications`,
  },
  {
    label: 'Social links',
    icon: <Iconify width={24} icon="solar:share-bold" />,
    href: `${paths.dashboard.user.account}/socials`,
  },
  {
    label: 'Security',
    icon: <Iconify width={24} icon="ic:round-vpn-key" />,
    href: `${paths.dashboard.user.account}/change-password`,
  },
];

// ----------------------------------------------------------------------

export function AccountLayout({ children, ...other }: DashboardContentProps) {
  const pathname = usePathname();
  const { user } = useAuthContext();
  const normalizedPathname = removeLastSlash(pathname);
  const isProfileEdit = normalizedPathname === paths.dashboard.user.account;
  const userName = user?.name || user?.phone || 'Profile';

  return (
    <DashboardContent {...other}>
      <CustomBreadcrumbs
        heading={isProfileEdit ? 'Edit' : 'Account'}
        backHref={isProfileEdit ? paths.dashboard.root : undefined}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'User', href: paths.dashboard.user.list },
          { name: isProfileEdit ? userName : 'Account' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
        slotProps={{
          heading: {
            sx: {
              fontSize: { xs: 28, md: 32 },
              lineHeight: 1.2,
              fontWeight: 700,
            },
          },
          breadcrumbs: {
            sx: {
              mt: 2.5,
              '& .MuiBreadcrumbs-separator': {
                mx: 1.5,
              },
            },
          },
        }}
      />

      {!isProfileEdit && (
        <Tabs value={normalizedPathname} sx={{ mb: { xs: 3, md: 5 } }}>
          {NAV_ITEMS.map((tab) => (
            <Tab
              component={RouterLink}
              key={tab.href}
              label={tab.label}
              icon={tab.icon}
              value={tab.href}
              href={tab.href}
            />
          ))}
        </Tabs>
      )}

      {children}
    </DashboardContent>
  );
}
