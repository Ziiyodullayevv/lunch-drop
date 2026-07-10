import type { NavSectionProps } from 'src/components/nav-section';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';
import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name: string) => (
  <SvgColor src={`${CONFIG.assetsDir}/assets/icons/navbar/${name}.svg`} />
);

const ICONS = {
  user: icon('ic-user'),
  order: <Iconify icon="custom:order-bag-bold" width={24} />,
  booking: icon('ic-building'),
  banking: icon('ic-banking'),
  analytics: icon('ic-analytics'),
  dashboard: icon('ic-dashboard'),
  invoice: icon('ic-menu'),
  product: icon('ic-kitchen'),
  lock: <Iconify icon="custom:settings-bold" width={24} />,
  map: icon('ic-location'),
};

// Role → visible pages:
//   super_admin   — Dashboard, Companies, Branches, Kitchens, Orders, Grouped Orders, Users, Analytics
//   company_admin — Dashboard, Branches, Kitchens, Orders, Grouped Orders, Users, Invoices
//   kitchen_admin — Dashboard, Menu, Grouped Orders
//   employee      — Dashboard, Orders

export const navData: NavSectionProps['data'] = [
  {
    subheader: 'Umumiy',
    items: [
      { title: 'Dashboard', path: paths.dashboard.root, icon: ICONS.dashboard },
      {
        title: 'Xarita',
        path: paths.dashboard.map,
        icon: ICONS.map,
        allowedRoles: ['super_admin', 'company_admin', 'kitchen_admin'],
      },
    ],
  },
  {
    subheader: 'Boshqaruv',
    items: [
      {
        title: 'Kompaniyalar',
        path: paths.dashboard.company.root,
        icon: ICONS.banking,
        allowedRoles: ['super_admin'],
        children: [
          { title: 'Barchasi', path: paths.dashboard.company.root },
          { title: "Qo'shish", path: paths.dashboard.company.new },
        ],
      },
      {
        title: 'Filiallar',
        path: paths.dashboard.branch.root,
        icon: ICONS.booking,
        allowedRoles: ['company_admin'],
        children: [
          { title: 'Barchasi', path: paths.dashboard.branch.root },
          { title: "Qo'shish", path: paths.dashboard.branch.new },
        ],
      },
      {
        title: 'Xodimlar',
        path: paths.dashboard.employee.list,
        icon: ICONS.user,
        allowedRoles: ['company_admin'],
        children: [
          { title: 'Barchasi', path: paths.dashboard.employee.list },
          { title: 'Yaratish', path: paths.dashboard.employee.new },
        ],
      },
      {
        title: 'Foydalanuvchilar',
        path: paths.dashboard.user.list,
        icon: ICONS.user,
        allowedRoles: ['super_admin'],
        children: [
          { title: 'Barchasi', path: paths.dashboard.user.list },
          { title: "Qo'shish", path: paths.dashboard.user.new },
        ],
      },
      {
        title: 'Oshxonalar',
        path: paths.dashboard.kitchen.root,
        icon: ICONS.product,
        allowedRoles: ['super_admin', 'company_admin'],
        children: [
          { title: 'Barchasi', path: paths.dashboard.kitchen.root },
          { title: "Qo'shish", path: paths.dashboard.kitchen.new, allowedRoles: ['super_admin'] },
        ],
      },
      {
        title: 'Menyu',
        path: paths.dashboard.menu.root,
        icon: ICONS.invoice,
        allowedRoles: ['kitchen_admin'],
        children: [
          { title: 'Barchasi', path: paths.dashboard.menu.root },
          { title: "Qo'shish", path: paths.dashboard.menu.new },
        ],
      },
      {
        title: 'Hamkorlar va so‘rovlar',
        path: paths.dashboard.kitchen.partners,
        icon: ICONS.banking,
        allowedRoles: ['kitchen_admin'],
      },
      {
        title: 'Buyurtmalar',
        path: paths.dashboard.order.root,
        icon: ICONS.order,
        allowedRoles: ['super_admin', 'company_admin', 'kitchen_admin', 'employee'],
      },
      {
        title: 'Hisob-fakturalar',
        path: paths.dashboard.invoice.root,
        icon: ICONS.banking,
        allowedRoles: ['company_admin'],
      },
    ],
  },
  {
    subheader: 'Tizim',
    items: [
      {
        title: 'Sozlamalar',
        path: paths.dashboard.kitchen.settings,
        icon: ICONS.lock,
        allowedRoles: ['kitchen_admin'],
      },
    ],
  },
];
