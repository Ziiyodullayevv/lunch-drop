export type OrderAnalytics = {
  total: number;
  totalAmount: number;
  active: number;
  activeAmount: number;
  onTheWay: number;
  onTheWayAmount: number;
  delivered: number;
  deliveredAmount: number;
  cancelled: number;
  cancelledAmount: number;
};

type AnalyticsOrder = {
  status: string;
  amount: number | string;
};

const EMPTY_ANALYTICS: OrderAnalytics = {
  total: 0,
  totalAmount: 0,
  active: 0,
  activeAmount: 0,
  onTheWay: 0,
  onTheWayAmount: 0,
  delivered: 0,
  deliveredAmount: 0,
  cancelled: 0,
  cancelledAmount: 0,
};

export function emptyOrderAnalytics(): OrderAnalytics {
  return { ...EMPTY_ANALYTICS };
}

export function calculateOrderAnalytics(
  orders: AnalyticsOrder[],
  activeStatuses = ['created', 'preparing']
): OrderAnalytics {
  const analytics = emptyOrderAnalytics();
  const activeStatusSet = new Set(activeStatuses);

  orders.forEach((order) => {
    const amount = Number(order.amount) || 0;

    analytics.total += 1;

    if (order.status !== 'cancelled') {
      analytics.totalAmount += amount;
    }

    if (activeStatusSet.has(order.status)) {
      analytics.active += 1;
      analytics.activeAmount += amount;
    }

    if (order.status === 'on_the_way') {
      analytics.onTheWay += 1;
      analytics.onTheWayAmount += amount;
    }

    if (order.status === 'delivered') {
      analytics.delivered += 1;
      analytics.deliveredAmount += amount;
    }

    if (order.status === 'cancelled') {
      analytics.cancelled += 1;
      analytics.cancelledAmount += amount;
    }
  });

  return analytics;
}
