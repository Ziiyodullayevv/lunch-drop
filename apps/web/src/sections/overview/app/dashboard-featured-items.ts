import type { DashboardRole } from 'src/lib/api/dashboard';

// ----------------------------------------------------------------------

export type DashboardFeaturedItem = {
  id: string;
  label: string;
  title: string;
  coverUrl: string;
  description: string;
};

type Translate = (key: string) => string;

const FEATURED_COVERS = [
  '/assets/images/mock/cover/cover-3.webp',
  '/assets/images/mock/cover/cover-7.webp',
  '/assets/images/mock/cover/cover-12.webp',
] as const;

const ROLE_FEATURES: Record<DashboardRole, readonly string[]> = {
  company_admin: ['employees', 'orders', 'invoices'],
  kitchen_admin: ['menu', 'orders', 'partners'],
  super_admin: ['organizations', 'kitchens', 'management'],
};

export function getDashboardFeaturedItems(role: DashboardRole, t: Translate): DashboardFeaturedItem[] {
  return ROLE_FEATURES[role].map((feature, index) => {
    const key = `dashboardFeatures.${role}.${feature}`;

    return {
      id: feature,
      coverUrl: FEATURED_COVERS[index],
      label: t(`${key}.label`),
      title: t(`${key}.title`),
      description: t(`${key}.description`),
    };
  });
}
