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
  menu: icon('ic-menu'),
  invoice: <Iconify icon="custom:invoice-duotone" width={24} />,
  product: icon('ic-kitchen'),
  lock: <Iconify icon="custom:settings-bold" width={24} />,
  map: icon('ic-location'),
};

// Role → visible pages:
//   super_admin   — Dashboard, Companies, Branches, Kitchens, Orders, Grouped Orders, Users, Analytics
//   company_admin — Dashboard, Branches, Kitchens, Orders, Grouped Orders, Users, Invoices
//   kitchen_admin — Dashboard, Menu, Grouped Orders
//   employee      — Dashboard, Orders

export function getDashboardNavData(t: (key: string) => string): NavSectionProps['data'] {
  return [
  {
    subheader: t('navigation.general'),
    items: [
      { title: t('navigation.dashboard'), path: paths.dashboard.root, icon: ICONS.dashboard },
      {
        title: t('navigation.map'),
        path: paths.dashboard.map,
        icon: ICONS.map,
        allowedRoles: ['super_admin', 'company_admin', 'kitchen_admin'],
      },
    ],
  },
  {
    subheader: t('navigation.management'),
    items: [
      {
        title: t('navigation.companies'),
        path: paths.dashboard.company.root,
        icon: ICONS.banking,
        allowedRoles: ['super_admin'],
        children: [
          { title: t('common.all'), path: paths.dashboard.company.root },
          { title: t('common.add'), path: paths.dashboard.company.new },
        ],
      },
      {
        title: t('navigation.branches'),
        path: paths.dashboard.branch.root,
        icon: ICONS.booking,
        allowedRoles: ['super_admin', 'company_admin'],
        children: [
          { title: t('common.all'), path: paths.dashboard.branch.root },
          { title: t('common.add'), path: paths.dashboard.branch.new },
        ],
      },
      {
        title: t('navigation.employees'),
        path: paths.dashboard.employee.list,
        icon: ICONS.user,
        allowedRoles: ['company_admin'],
        children: [
          { title: t('common.all'), path: paths.dashboard.employee.list },
        ],
      },
      {
        title: t('navigation.kitchens'),
        path: paths.dashboard.kitchen.root,
        icon: ICONS.product,
        allowedRoles: ['super_admin', 'company_admin'],
        children: [
          { title: t('common.all'), path: paths.dashboard.kitchen.root },
          { title: t('common.add'), path: paths.dashboard.kitchen.new, allowedRoles: ['super_admin'] },
        ],
      },
      {
        title: t('navigation.users'),
        path: paths.dashboard.user.list,
        icon: ICONS.user,
        allowedRoles: ['super_admin'],
        children: [
          { title: t('common.all'), path: paths.dashboard.user.list },
          { title: t('common.add'), path: paths.dashboard.user.new },
        ],
      },
      {
        title: t('navigation.menu'),
        path: paths.dashboard.menu.root,
        icon: ICONS.menu,
        allowedRoles: ['kitchen_admin'],
        children: [
          { title: t('common.all'), path: paths.dashboard.menu.root },
          { title: t('common.add'), path: paths.dashboard.menu.new },
        ],
      },
      {
        title: t('navigation.settlements'),
        path: paths.dashboard.kitchen.settlements,
        icon: ICONS.invoice,
        allowedRoles: ['kitchen_admin'],
      },
      {
        title: t('navigation.orders'),
        path: paths.dashboard.order.root,
        icon: ICONS.order,
        allowedRoles: ['super_admin', 'company_admin', 'kitchen_admin', 'employee'],
      },
      {
        title: t('navigation.invoices'),
        path: paths.dashboard.invoice.root,
        icon: ICONS.invoice,
        allowedRoles: ['super_admin', 'company_admin'],
      },
    ],
  },
  {
    subheader: t('navigation.system'),
    items: [
      {
        title: t('navigation.settings'),
        path: paths.dashboard.kitchen.settings,
        icon: ICONS.lock,
        allowedRoles: ['kitchen_admin'],
      },
    ],
  },
  ];
}
