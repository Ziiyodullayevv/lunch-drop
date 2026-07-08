import type { OrderRead } from 'src/lib/api/orders';

import { it, expect, describe } from 'vitest';

import {
  buildClaimPayload,
  validateDeliveryForm,
  buildCheckPricePayload,
  groupOrdersForDelivery,
} from './yandex-delivery-data';

const createOrder = (overrides: Partial<OrderRead> = {}): OrderRead => ({
  id: 'order-1',
  employee_id: 'employee-1',
  kitchen_id: 'kitchen-1',
  meal_id: 'meal-1',
  target_date: '2026-06-12',
  historical_price: '25000.00',
  system_fee: '1250.00',
  status: 'preparing',
  created_at: '2026-06-12T08:00:00Z',
  employee_name: 'Ali',
  branch_id: 'branch-1',
  branch_name: 'Chilonzor',
  company_id: 'company-1',
  company_name: 'LunchDrop',
  kitchen_name: 'Test kitchen',
  meal_name: 'Osh',
  ...overrides,
});

const form = {
  pickupAddress: 'Toshkent, Amir Temur 1',
  pickupPhone: '+998901112233',
  pickupLng: '69.2797',
  pickupLat: '41.3111',
  dropoffAddress: 'Toshkent, Bunyodkor 7',
  dropoffPhone: '+998909998877',
  dropoffContactName: 'Chilonzor filial',
  dropoffLng: '69.2034',
  dropoffLat: '41.2856',
  weightKg: '2.5',
};

describe('Yandex delivery data', () => {
  it('groups active orders by kitchen, branch and date', () => {
    const groups = groupOrdersForDelivery([
      createOrder(),
      createOrder({ id: 'order-2', historical_price: '30000.00' }),
      createOrder({ id: 'order-3', branch_id: 'branch-2', branch_name: 'Yunusobod' }),
      createOrder({ id: 'order-4', status: 'delivered' }),
      createOrder({ id: 'order-5', status: 'on_the_way' }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups.find((group) => group.branchId === 'branch-1')).toMatchObject({
      orderCount: 3,
      totalAmount: 80000,
      orderIds: ['order-1', 'order-2', 'order-5'],
    });
  });

  it('builds check-price coordinates in longitude, latitude order', () => {
    const payload = buildCheckPricePayload(form);

    expect(validateDeliveryForm(form)).toBeNull();
    expect(payload.route_points[0].coordinates).toEqual([69.2797, 41.3111]);
    expect(payload.route_points[1].coordinates).toEqual([69.2034, 41.2856]);
    expect(payload.items[0]).toMatchObject({
      pickup_point: 1,
      dropoff_point: 2,
      weight: 2.5,
    });
  });

  it('uses the Yandex claims/create droppof_point field', () => {
    const group = groupOrdersForDelivery([createOrder()])[0];
    const payload = buildClaimPayload(
      group,
      {
        id: 'kitchen-1',
        name: 'Test kitchen',
        phone: '+998901112233',
        lng: 69.2797,
        lat: 41.3111,
      },
      form,
      'UZS'
    );

    expect(payload.items[0]).toMatchObject({
      pickup_point: 1,
      droppof_point: 2,
      cost_currency: 'UZS',
    });
    expect(payload.route_points[0].address.coordinates).toEqual([69.2797, 41.3111]);
  });
});
