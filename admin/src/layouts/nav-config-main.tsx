import type { NavMainProps } from './main/nav/types';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export const navData: NavMainProps['data'] = [
  {
    title: 'Bosh sahifa',
    path: '/',
    icon: <Iconify width={22} icon="solar:home-angle-bold-duotone" />,
  },
  {
    title: 'Imkoniyatlar',
    path: '/#imkoniyatlar',
    icon: <Iconify width={22} icon="solar:notebook-bold-duotone" />,
  },
  {
    title: 'Ishlash jarayoni',
    path: '/#jarayon',
    icon: <Iconify width={22} icon="solar:transfer-horizontal-bold-duotone" />,
  },
  {
    title: 'Savollar',
    path: '/#savollar',
    icon: <Iconify width={22} icon="solar:info-circle-bold" />,
  },
];
