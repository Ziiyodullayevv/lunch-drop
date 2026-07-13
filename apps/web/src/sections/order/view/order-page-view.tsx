'use client';

import { useAuthContext } from 'src/auth/hooks';

import { OrderListView } from './order-list-view';
import { KitchenOrdersView } from './kitchen-orders-view';

// ----------------------------------------------------------------------

export function OrderPageView() {
  const { user } = useAuthContext();

  if (user?.role === 'super_admin') {
    return <KitchenOrdersView scope="super_admin" />;
  }

  if (user?.role === 'company_admin') {
    return <KitchenOrdersView scope="company_admin" />;
  }

  if (user?.role === 'kitchen_admin') {
    return <KitchenOrdersView />;
  }

  return <OrderListView />;
}
