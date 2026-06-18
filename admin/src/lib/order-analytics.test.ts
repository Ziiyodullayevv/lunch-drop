import { it, expect, describe } from 'vitest';

import { calculateOrderAnalytics } from './order-analytics';

describe('calculateOrderAnalytics', () => {
  it("statuslar bo'yicha son va summalarni hisoblaydi", () => {
    const result = calculateOrderAnalytics([
      { status: 'created', amount: '10000' },
      { status: 'preparing', amount: 20000 },
      { status: 'on_the_way', amount: 30000 },
      { status: 'delivered', amount: 40000 },
      { status: 'cancelled', amount: 50000 },
    ]);

    expect(result).toEqual({
      total: 5,
      totalAmount: 100000,
      active: 2,
      activeAmount: 30000,
      onTheWay: 1,
      onTheWayAmount: 30000,
      delivered: 1,
      deliveredAmount: 40000,
      cancelled: 1,
      cancelledAmount: 50000,
    });
  });

  it("legacy aktiv statuslarini parametr orqali birlashtiradi", () => {
    const result = calculateOrderAnalytics(
      [
        { status: 'pending', amount: 10000 },
        { status: 'ready', amount: 20000 },
        { status: 'delivered', amount: 30000 },
      ],
      ['pending', 'ready']
    );

    expect(result.active).toBe(2);
    expect(result.activeAmount).toBe(30000);
  });
});
