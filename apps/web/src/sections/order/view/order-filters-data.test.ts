import type { OrderRead } from 'src/lib/api/orders';

import { it, expect, describe } from 'vitest';

import { filterOrdersForView } from './order-filters-data';

const createOrder = (overrides: Partial<OrderRead> = {}): OrderRead => ({
  id: 'order-1',
  employee_id: 'employee-1',
  kitchen_id: 'kitchen-1',
  meal_id: 'meal-1',
  target_date: '2026-06-11',
  historical_price: '30000.00',
  system_fee: '1500.00',
  status: 'delivered',
  created_at: '2026-06-11T08:00:00Z',
  employee_name: 'Akobir Ziyodullayev',
  employee_phone: '+998901234567',
  employee_avatar_url: '/media/avatars/akobir.png',
  branch_id: 'branch-1',
  branch_name: 'Tinchlik filiali',
  company_id: 'company-1',
  company_name: 'Mars IT',
  kitchen_name: 'Ochil Dasturxon',
  meal_name: 'Osh',
  meal_image_url: '/media/meals/osh.png',
  ...overrides,
});

describe('order view filters', () => {
  it('filters inclusive date range and entity ids', () => {
    const orders = [
      createOrder(),
      createOrder({ id: 'order-2', target_date: '2026-06-12' }),
      createOrder({ id: 'order-3', target_date: '2026-06-13' }),
      createOrder({ id: 'order-4', branch_id: 'branch-2' }),
    ];

    expect(
      filterOrdersForView(orders, {
        startDate: '2026-06-11',
        endDate: '2026-06-12',
        companyId: 'company-1',
        branchId: 'branch-1',
        kitchenId: 'kitchen-1',
      }).map((order) => order.id)
    ).toEqual(['order-1', 'order-2']);
  });

  it.each([
    ['employee name', 'akobir ziyodullayev'],
    ['formatted phone', '90 123-45-67'],
    ['full phone', '+998901234567'],
    ['order id', 'order-1'],
    ['displayed order id', '#order-1'],
  ])('searches by %s', (_label, search) => {
    expect(filterOrdersForView([createOrder()], { search })).toHaveLength(1);
  });

  it('does not use company, branch or meal as free-text search fields', () => {
    expect(filterOrdersForView([createOrder()], { search: 'Mars IT' })).toHaveLength(0);
    expect(filterOrdersForView([createOrder()], { search: 'Tinchlik' })).toHaveLength(0);
    expect(filterOrdersForView([createOrder()], { search: 'Osh' })).toHaveLength(0);
  });
});
