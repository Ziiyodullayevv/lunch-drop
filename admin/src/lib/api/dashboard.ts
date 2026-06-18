import { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

export type DashboardRole = 'super_admin' | 'company_admin' | 'kitchen_admin';

export type DashboardSummaryKey =
  | 'orders_today'
  | 'delivered_today'
  | 'cancelled_today'
  | 'orders_total'
  | 'revenue_total'
  | 'active_companies'
  | 'companies_total'
  | 'active_kitchens'
  | 'lunch_subscribers_today'
  | 'monthly_cost'
  | 'delivered_total'
  | 'branches_total'
  | 'active_employees'
  | 'portions_today'
  | 'weekly_revenue'
  | 'connected_companies';

export type DashboardHistoryPoint = {
  date: string;
  value: number;
};

export type DashboardSummaryCard = {
  key: DashboardSummaryKey;
  value: number;
  trend_percent: number | null;
  history: DashboardHistoryPoint[];
};

export type DashboardOrderStatusTotals = {
  created: number;
  preparing: number;
  on_the_way: number;
  delivered: number;
  cancelled: number;
};

export type DashboardMonthlyOrders = {
  year: number;
  delivered: number[];
  cancelled: number[];
};

export type DashboardResponse = {
  year: number;
  timezone: 'Asia/Tashkent';
  generated_at: string;
  summary: DashboardSummaryCard[];
  order_status_totals: DashboardOrderStatusTotals;
  monthly_orders: DashboardMonthlyOrders;
};

const DASHBOARD_ENDPOINTS: Record<DashboardRole, string> = {
  super_admin: endpoints.superAdmin.dashboard,
  company_admin: endpoints.company.dashboard,
  kitchen_admin: endpoints.kitchen.dashboard,
};

export function fetchDashboard(role: DashboardRole, year?: number) {
  return fetcher<DashboardResponse>([
    DASHBOARD_ENDPOINTS[role],
    { params: year ? { year } : undefined },
  ]);
}
