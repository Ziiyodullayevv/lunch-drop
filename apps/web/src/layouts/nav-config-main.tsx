import type { NavMainProps } from './main/nav/types';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function getMainNavData(t: (key: string) => string): NavMainProps['data'] {
  return [
  {
    title: t('mainNav.home'),
    path: '/',
    icon: <Iconify width={22} icon="solar:home-angle-bold-duotone" />,
  },
  {
    title: t('mainNav.features'),
    path: '/#imkoniyatlar',
    icon: <Iconify width={22} icon="solar:notebook-bold-duotone" />,
  },
  {
    title: t('mainNav.workflow'),
    path: '/#jarayon',
    icon: <Iconify width={22} icon="solar:transfer-horizontal-bold-duotone" />,
  },
  {
    title: t('mainNav.faq'),
    path: '/#savollar',
    icon: <Iconify width={22} icon="solar:info-circle-bold" />,
  },
  ];
}
