import axiosInstance, { fetcher, endpoints } from 'src/lib/axios';

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
  meal_name: string | null;
};

export type Page<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
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
};

export function fetchKitchenOrders(params?: { target_date?: string }) {
  return fetcher<OrderRead[]>([endpoints.kitchen.orders, { params }]);
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

export function fetchCompanyOrders(params?: {
  target_date?: string;
  order_status?: OrderStatus;
  limit?: number;
  offset?: number;
}) {
  return fetcher<Page<OrderRead>>([endpoints.company.orders, { params }]);
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
