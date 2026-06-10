'use client';

import { useAuthContext } from 'src/auth/hooks';

import { GroupedOrderListView } from 'src/sections/grouped-order/view/grouped-order-list-view';

import { OrderListView } from './order-list-view';
import { CompanyOrdersView } from './company-orders-view';
import { KitchenOrdersView } from './kitchen-orders-view';

// ----------------------------------------------------------------------

export function OrderPageView() {
  const { user } = useAuthContext();

  if (user?.role === 'super_admin') {
    return <GroupedOrderListView />;
  }

  if (user?.role === 'company_admin') {
    return <CompanyOrdersView />;
  }

  if (user?.role === 'kitchen_admin') {
    return <KitchenOrdersView />;
  }

  return <OrderListView />;
}
