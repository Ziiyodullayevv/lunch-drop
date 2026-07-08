import type { OrderAnalytics } from 'src/lib/order-analytics';

import axiosInstance, { fetcher, endpoints } from 'src/lib/axios';
import { calculateOrderAnalytics } from 'src/lib/order-analytics';

// ----------------------------------------------------------------------

export type OrderStatus = 'created' | 'preparing' | 'on_the_way' | 'delivered' | 'cancelled';

export type OrderRead = {
  id: string;
  employee_id: string;
  kitchen_id: string;
  meal_id: string;
  target_date: string;
  historical_price: string;
  system_fee: string;
  status: OrderStatus;
  created_at: string;
  // Enriched fields — backend should include these in the response
  employee_name: string | null;
  branch_id: string | null;
  branch_name: string | null;
  company_id: string | null;
  company_name: string | null;
  kitchen_name: string | null;
  meal_name: string | null;
};

export type Page<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

export type OrderStatusCounts = Record<OrderStatus | 'all' | 'active', number>;

export type OrdersPage = Page<OrderRead> & {
  status_counts?: OrderStatusCounts;
  analytics?: OrderAnalytics;
};

export type SuperAdminOrdersParams = {
  company_id?: string;
  kitchen_id?: string;
  branch_id?: string;
  order_status?: OrderStatus;
  target_date?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

export type CompanyOrdersParams = {
  start_date?: string;
  end_date?: string;
  order_status?: OrderStatus;
  limit?: number;
  offset?: number;
};

export type InvoiceStatus = 'pending' | 'paid';

export type InvoiceRead = {
  id: string;
  company_id: string;
  period_start: string;
  period_end: string;
  total_company_expense: string;
  total_system_fee: string;
  total_kitchen_profit: string;
  status: InvoiceStatus;
  created_at: string;
};

export type AccountStatus = 'pending_approval' | 'approved' | 'rejected' | 'inactive';

export type PendingEmployeeRead = {
  id: string;
  phone: string;
  name: string | null;
  branch_id: string | null;
  account_status: AccountStatus | null;
  created_at: string;
};

// UserRead — GET /company/employees response
export type EmployeeRead = {
  id: string;
  phone: string;
  name: string | null;
  role: string;
  is_active: boolean;
  account_status: AccountStatus | null;
  company_id: string | null;
  branch_id: string | null;
  kitchen_id: string | null;
};

// ----------------------------------------------------------------------

export type OrderHistoryItem = {
  id: string;
  target_date: string;
  status: OrderStatus;
  status_label: string;
  historical_price: string;
  system_fee: string;
  meal_id: string;
  meal_name: string;
  meal_image_url: string | null;
  kitchen_id: string;
  kitchen_name: string;
  branch_id: string;
  branch_name: string;
  created_at: string;
};

export type KitchenMe = {
  id: string;
  name: string;
  phone: string | null;
  lat: number;
  lng: number;
};

export function fetchKitchenOrders(params?: { target_date?: string }) {
  return fetcher<OrderRead[]>([endpoints.kitchen.orders, { params }]);
}

export function fetchKitchenOrder(id: string) {
  return fetcher<OrderRead>(endpoints.kitchen.order(id));
}

export function fetchKitchenMe() {
  return fetcher<KitchenMe>(endpoints.kitchen.me);
}

export function updateOrderStatus(id: string, status: OrderStatus) {
  return axiosInstance
    .patch<OrderRead>(endpoints.kitchen.orderStatus(id), { status })
    .then((r) => r.data);
}

// ----------------------------------------------------------------------

export function fetchPendingEmployees() {
  return fetcher<PendingEmployeeRead[]>(endpoints.company.pendingEmployees);
}

export function fetchCompanyEmployees(params?: { account_status?: AccountStatus; limit?: number; offset?: number }) {
  return fetcher<Page<EmployeeRead>>([endpoints.company.employees, { params }]);
}

export function updateEmployeeStatus(id: string, status: AccountStatus) {
  return axiosInstance
    .patch(endpoints.company.employeeStatus(id), { status })
    .then((r) => r.data);
}

export function bulkConfirmOrders() {
  return axiosInstance
    .patch<{ confirmed: number }>(endpoints.company.bulkConfirm)
    .then((r) => r.data);
}

export function fetchInvoices() {
  return fetcher<InvoiceRead[]>(endpoints.company.invoices);
}

// ----------------------------------------------------------------------

export async function fetchCompanyOrders(params?: CompanyOrdersParams): Promise<OrdersPage> {
  const {
    start_date: startDate,
    end_date: endDate,
    order_status: orderStatus,
    limit = 50,
    offset = 0,
    ...apiFilters
  } = params ?? {};

  if (!startDate && !endDate) {
    return fetcher<OrdersPage>([
      endpoints.company.orders,
      { params: { ...apiFilters, order_status: orderStatus, limit, offset } },
    ]);
  }

  const pageSize = 100;
  const firstPage = await fetcher<Page<OrderRead>>([
    endpoints.company.orders,
    { params: { ...apiFilters, limit: pageSize, offset: 0 } },
  ]);
  const remainingPageCount = Math.max(0, Math.ceil(firstPage.total / pageSize) - 1);
  const remainingPages = await Promise.all(
    Array.from({ length: remainingPageCount }, (_, index) =>
      fetcher<Page<OrderRead>>([
        endpoints.company.orders,
        { params: { ...apiFilters, limit: pageSize, offset: (index + 1) * pageSize } },
      ])
    )
  );
  const filteredOrders = [firstPage, ...remainingPages]
    .flatMap((page) => page.items)
    .filter(
      (order) =>
        (!startDate || order.target_date >= startDate) &&
        (!endDate || order.target_date <= endDate)
    );
  const statusCounts = countOrderStatuses(filteredOrders);
  const analytics = calculateOrderAnalytics(
    filteredOrders.map((order) => ({
      status: order.status,
      amount: order.historical_price,
    }))
  );
  const statusOrders = orderStatus
    ? filteredOrders.filter((order) => order.status === orderStatus)
    : filteredOrders;

  return {
    items: statusOrders.slice(offset, offset + limit),
    total: statusOrders.length,
    limit,
    offset,
    status_counts: statusCounts,
    analytics,
  };
}

export async function fetchSuperAdminOrders(
  params?: SuperAdminOrdersParams
): Promise<OrdersPage> {
  const search = params?.search?.trim().toLowerCase();
  const startDate = params?.start_date;
  const endDate = params?.end_date;

  if (!search && !startDate && !endDate) {
    return fetcher<OrdersPage>([endpoints.superAdmin.orders, { params }]);
  }

  const {
    search: _search,
    start_date: _startDate,
    end_date: _endDate,
    order_status: orderStatus,
    limit = 50,
    offset = 0,
    ...filters
  } = params ?? {};
  const pageSize = 100;
  const firstPage = await fetcher<Page<OrderRead>>([
    endpoints.superAdmin.orders,
    { params: { ...filters, limit: pageSize, offset: 0 } },
  ]);
  const remainingPageCount = Math.max(0, Math.ceil(firstPage.total / pageSize) - 1);
  const remainingPages = await Promise.all(
    Array.from({ length: remainingPageCount }, (_, index) =>
      fetcher<Page<OrderRead>>([
        endpoints.superAdmin.orders,
        { params: { ...filters, limit: pageSize, offset: (index + 1) * pageSize } },
      ])
    )
  );
  const searchTerms = search?.split(/\s+/) ?? [];
  const filteredOrders = [firstPage, ...remainingPages]
    .flatMap((page) => page.items)
    .filter((order) => {
      if (startDate && order.target_date < startDate) return false;
      if (endDate && order.target_date > endDate) return false;
      if (!search) return true;

      const searchableValue = [
        order.id,
        order.company_name,
        order.branch_name,
        order.kitchen_name,
        order.employee_name,
        order.meal_name,
        order.target_date,
        order.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchTerms.every((term) => searchableValue.includes(term));
    });
  const statusCounts = countOrderStatuses(filteredOrders);
  const analytics = calculateOrderAnalytics(
    filteredOrders.map((order) => ({
      status: order.status,
      amount: order.historical_price,
    }))
  );
  const statusOrders = orderStatus
    ? filteredOrders.filter((order) => order.status === orderStatus)
    : filteredOrders;

  return {
    items: statusOrders.slice(offset, offset + limit),
    total: statusOrders.length,
    limit,
    offset,
    status_counts: statusCounts,
    analytics,
  };
}

function countOrderStatuses(orders: OrderRead[]): OrderStatusCounts {
  const counts: OrderStatusCounts = {
    all: orders.length,
    active: 0,
    created: 0,
    preparing: 0,
    on_the_way: 0,
    delivered: 0,
    cancelled: 0,
  };

  orders.forEach((order) => {
    counts[order.status] += 1;
    if (order.status === 'created' || order.status === 'preparing') {
      counts.active += 1;
    }
  });

  return counts;
}

export function fetchSuperAdminOrder(id: string) {
  return fetcher<OrderRead>(endpoints.superAdmin.order(id));
}

export function fetchOrdersList(params?: {
  month?: string;
  target_date?: string;
  order_status?: OrderStatus;
  limit?: number;
  offset?: number;
}) {
  return fetcher<Page<OrderHistoryItem>>([endpoints.orders.list, { params }]);
}

export function fetchOrderDetail(id: string) {
  return fetcher<OrderHistoryItem>(endpoints.orders.detail(id));
}

export function confirmDelivery(id: string) {
  return axiosInstance
    .patch<OrderRead>(endpoints.orders.confirmDelivery(id))
    .then((r) => r.data);
}

export function cancelOrder(id: string) {
  return axiosInstance
    .post<OrderRead>(endpoints.orders.cancel(id))
    .then((r) => r.data);
}

// ----------------------------------------------------------------------

export type EmployeeBranch = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

export type EmployeeStatus = {
  account_status: string | null;
  company_id: string | null;
  branches: EmployeeBranch[];
};

export type MenuItem = {
  id: string;
  kitchen_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: string;
  image_url: string | null;
};

export type EmployeeMenu = {
  target_date: string;
  items: MenuItem[];
};

export function fetchEmployeeStatus() {
  return fetcher<EmployeeStatus>(endpoints.employee.status);
}

export function fetchEmployeeMenu(target_date?: string) {
  return fetcher<EmployeeMenu>([endpoints.employee.menu, { params: target_date ? { target_date } : undefined }]);
}

export function placeOrder(body: {
  branch_id: string;
  kitchen_id: string;
  meal_id: string;
  target_date: string;
}) {
  return axiosInstance
    .post<OrderRead>(endpoints.orders.create, body)
    .then((r) => r.data);
}

export function fetchCompanyBranches() {
  return fetcher<{ id: string; name: string; address: string; company_id: string; created_at: string }[]>(
    endpoints.company.branches
  );
}

export function fetchCompanyKitchens() {
  return fetcher<{ id: string; name: string; description: string | null; phone: string | null; is_active: boolean; order_cutoff_time: string; delivery_start_time: string; delivery_end_time: string; created_at: string }[]>(
    endpoints.company.kitchens
  );
}
