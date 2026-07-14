import type { DashboardRole } from 'src/lib/api/dashboard';

import { it, expect, describe } from 'vitest';

import { getDashboardFeaturedItems } from './dashboard-featured-items';

const expectedIds: Record<DashboardRole, string[]> = {
  company_admin: ['employees', 'orders', 'invoices'],
  kitchen_admin: ['menu', 'orders', 'partners'],
  super_admin: ['organizations', 'kitchens', 'management'],
};

describe('getDashboardFeaturedItems', () => {
  it.each(Object.entries(expectedIds) as [DashboardRole, string[]][])('%s uchun mos imkoniyatlarni qaytaradi', (role, ids) => {
    const items = getDashboardFeaturedItems(role, (key) => key);

    expect(items).toHaveLength(3);
    expect(items.map((item) => item.id)).toEqual(ids);
    expect(items.flatMap((item) => [item.label, item.title, item.description]).join(' ')).not.toMatch(/\d/);
  });
});
