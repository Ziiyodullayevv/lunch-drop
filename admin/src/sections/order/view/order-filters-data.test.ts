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
  branch_id: 'branch-1',
  branch_name: 'Tinchlik filiali',
  company_id: 'company-1',
  company_name: 'Mars IT',
  kitchen_name: 'Ochil Dasturxon',
  meal_name: 'Osh',
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

  it('searches company, branch, kitchen, employee and meal terms together', () => {
    const result = filterOrdersForView([createOrder()], {
      search: 'mars tinchlik dasturxon akobir osh',
    });

    expect(result).toHaveLength(1);
  });
});
