'use client';

import type {
  DashboardRole,
  DashboardSummaryKey,
  DashboardSummaryCard,
} from 'src/lib/api/dashboard';

import { useQuery } from '@tanstack/react-query';

import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fNumber, fCurrency } from 'src/utils/format-number';

import { useTranslate } from 'src/locales';
import { fetchDashboard } from 'src/lib/api/dashboard';
import { DashboardContent } from 'src/layouts/dashboard';
import { SeoIllustration } from 'src/assets/illustrations';

import { useAuthContext } from 'src/auth/hooks';

import { AppWelcome } from '../app-welcome';
import { AppFeatured } from '../app-featured';
import { AppTopCompanies } from '../app-top-companies';
import { AppWidgetSummary } from '../app-widget-summary';
import { AppLunchActivity } from '../app-lunch-activity';
import { AppMonthlyAmount } from '../app-monthly-amount';
import { AppTodayOrderStatuses } from '../app-today-order-statuses';
import { AppMonthlyRevenueSplit } from '../app-monthly-revenue-split';
import { getDashboardFeaturedItems } from '../dashboard-featured-items';

// ----------------------------------------------------------------------

const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;

const SUMMARY_META: Record<
  DashboardSummaryKey,
  {
    title: string;
    color: 'primary' | 'info' | 'warning' | 'success' | 'error';
    currency?: boolean;
    translationKey?: string;
  }
> = {
  orders_today: { title: 'ordersToday', color: 'primary' },
  delivered_today: { title: 'deliveredToday', color: 'success' },
  cancelled_today: { title: 'cancelledToday', color: 'error' },
  orders_total: { title: 'ordersTotal', color: 'primary' },
  revenue_total: { title: 'revenueTotal', color: 'info', currency: true },
  monthly_total_revenue: {
    title: 'monthlyTotalRevenue',
    color: 'success',
    currency: true,
    translationKey: 'superAdminKpis.monthlyTotalRevenue',
  },
  monthly_system_fee: {
    title: 'monthlySystemFee',
    color: 'info',
    currency: true,
    translationKey: 'superAdminKpis.monthlySystemFee',
  },
  pending_admin_approvals: {
    title: 'pendingAdminApprovals',
    color: 'warning',
    translationKey: 'superAdminKpis.pendingAdminApprovals',
  },
  active_companies: { title: 'activeCompanies', color: 'success' },
  companies_total: { title: 'companiesTotal', color: 'primary' },
  active_kitchens: { title: 'activeKitchens', color: 'warning' },
  lunch_subscribers_today: { title: 'lunchSubscribersToday', color: 'primary' },
  monthly_cost: { title: 'monthlyCost', color: 'info', currency: true },
  delivered_total: { title: 'deliveredTotal', color: 'success' },
  branches_total: { title: 'branchesTotal', color: 'warning' },
  active_employees: { title: 'activeEmployees', color: 'primary' },
  weekly_delivered_orders: { title: 'weeklyDeliveredOrders', color: 'success' },
  portions_today: { title: 'portionsToday', color: 'primary' },
  weekly_net_revenue: { title: 'weeklyNetRevenue', color: 'info', currency: true },
  menu_items_today: { title: 'menuItemsToday', color: 'warning' },
  weekly_revenue: { title: 'weeklyRevenue', color: 'info', currency: true },
  connected_companies: { title: 'connectedCompanies', color: 'warning' },
};

const STATUS_META = [
  { key: 'created', label: 'new' },
  { key: 'preparing', label: 'preparing' },
  { key: 'on_the_way', label: 'onTheWay' },
  { key: 'delivered', label: 'delivered' },
  { key: 'cancelled', label: 'cancelled' },
] as const;

const SUPER_ADMIN_SUMMARY_KEYS: DashboardSummaryKey[] = [
  'orders_today',
  'monthly_system_fee',
  'monthly_total_revenue',
];

const COMPANY_ADMIN_SUMMARY_KEYS: DashboardSummaryKey[] = [
  'active_employees',
  'monthly_cost',
  'weekly_delivered_orders',
];

const KITCHEN_ADMIN_SUMMARY_KEYS: DashboardSummaryKey[] = [
  'portions_today',
  'weekly_net_revenue',
  'menu_items_today',
];

function isDashboardRole(role: unknown): role is DashboardRole {
  return role === 'super_admin' || role === 'company_admin' || role === 'kitchen_admin';
}

function summaryCategories(card: DashboardSummaryCard) {
  return card.history.map((point) =>
    new Intl.DateTimeFormat('uz-UZ', { weekday: 'short' }).format(new Date(`${point.date}T00:00:00`))
  );
}

// ----------------------------------------------------------------------

export function OverviewAppView() {
  const { t } = useTranslate('common');
  const theme = useTheme();
  const { user } = useAuthContext();
  const role = isDashboardRole(user?.role) ? user.role : null;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard', role],
    queryFn: () => fetchDashboard(role!),
    enabled: Boolean(role),
  });

  const colorMap = {
    primary: theme.palette.primary.main,
    info: theme.palette.info.main,
    warning: theme.palette.warning.main,
    success: theme.palette.success.main,
    error: theme.palette.error.main,
  };

  const kitchenAnalytics = data?.kitchen_admin_analytics;
  const kitchenStatusSeries = kitchenAnalytics
    ? STATUS_META.map(({ key, label }) => ({
        label: t(`dashboard.status.${label}`),
        value: kitchenAnalytics.today_order_statuses[key],
      }))
    : [];

  const summaryKeys =
    role === 'super_admin'
      ? SUPER_ADMIN_SUMMARY_KEYS
      : role === 'company_admin'
        ? COMPANY_ADMIN_SUMMARY_KEYS
        : KITCHEN_ADMIN_SUMMARY_KEYS;
  const summaryCards = data?.summary.filter((card) => summaryKeys.includes(card.key));
  const summarySkeletonCount = 3;

  const featuredItems = role ? getDashboardFeaturedItems(role, t) : [];
  const superAdminAnalytics = data?.super_admin_analytics;
  const companyAnalytics = data?.company_admin_analytics;
  const monthCategories = MONTH_KEYS.map((key) => t(`dashboard.months.${key}`));

  return (
    <DashboardContent maxWidth="xl">
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <AppWelcome
            title={`${t('dashboard.welcome')} 👋\n${user?.name ?? ''}`}
            description={t('dashboard.subtitle')}
            img={<SeoIllustration hideBackground />}
            action={
              <Button component={RouterLink} href={paths.dashboard.order.root} variant="contained" color="primary">
                {t('dashboard.orderTrend')}
              </Button>
            }
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          {role ? <AppFeatured list={featuredItems} /> : <Skeleton variant="rounded" height={288} />}
        </Grid>
      </Grid>

      {isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error instanceof Error ? error.message : t('dashboard.loadError')}
        </Alert>
      )}

      <Grid container spacing={3}>
        {isLoading
          ? Array.from({ length: summarySkeletonCount }, (_, index) => (
              <Grid key={index} size={{ xs: 12, sm: 6, lg: 4 }}>
                <Skeleton variant="rounded" height={152} />
              </Grid>
            ))
          : summaryCards?.map((card) => {
              const meta = SUMMARY_META[card.key];

              return (
                <Grid key={card.key} size={{ xs: 12, sm: 6, lg: 4 }}>
                  <AppWidgetSummary
                    title={t(meta.translationKey ?? `dashboard.summary.${meta.title}`)}
                    percent={card.trend_percent}
                    total={card.value}
                    valueFormatter={meta.currency ? fCurrency : fNumber}
                    chart={{
                      colors: [colorMap[meta.color]],
                      categories: summaryCategories(card),
                      series: card.history.map((point) => point.value),
                    }}
                    sx={{ height: 1 }}
                  />
                </Grid>
              );
            })}

        {!isLoading && !isError && summaryCards?.length === 0 && (
          <Grid size={{ xs: 12 }}>
            <Alert severity="info">{t('dashboard.noStats')}</Alert>
          </Grid>
        )}

        <Grid size={{ xs: 12 }}>
          {role === 'super_admin' ? (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, lg: 4 }} sx={{ display: 'flex' }}>
                <AppTopCompanies
                  title={t('superAdminAnalytics.topCompanies')}
                  subheader={t('superAdminAnalytics.currentMonth')}
                  emptyText={t('superAdminAnalytics.noCompanies')}
                  ordersLabel={t('order.unit')}
                  list={superAdminAnalytics?.top_companies ?? []}
                  sx={{ width: 1, height: 1 }}
                />
              </Grid>

              <Grid size={{ xs: 12, lg: 8 }} sx={{ display: 'flex' }}>
                <AppMonthlyRevenueSplit
                  title={t('superAdminAnalytics.monthlyRevenueAndFee')}
                  subheader={t('dashboard.year', { year: superAdminAnalytics?.monthly_system_fee.year ?? data?.year })}
                  totalRevenueLabel={t('superAdminAnalytics.totalRevenue')}
                  kitchenShareLabel={t('superAdminAnalytics.kitchenShare')}
                  systemFeeLabel={t('superAdminAnalytics.systemFee')}
                  categories={monthCategories}
                  revenue={superAdminAnalytics?.monthly_revenue.values ?? Array(12).fill(0)}
                  systemFee={superAdminAnalytics?.monthly_system_fee.values ?? Array(12).fill(0)}
                  sx={{ width: 1, height: 1 }}
                />
              </Grid>
            </Grid>
          ) : role === 'company_admin' ? (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, lg: 4 }} sx={{ display: 'flex' }}>
                <AppLunchActivity
                  title={t('companyAnalytics.lunchActivity')}
                  subheader={t('companyAnalytics.lastSevenDays')}
                  emptyText={t('companyAnalytics.noLunchActivity')}
                  categories={(companyAnalytics?.lunch_activity ?? []).map((point) =>
                    new Intl.DateTimeFormat('uz-UZ', { weekday: 'short' }).format(
                      new Date(`${point.date}T00:00:00`)
                    )
                  )}
                  series={(companyAnalytics?.lunch_activity ?? []).map((point) => point.value)}
                  sx={{ width: 1, height: 1 }}
                />
              </Grid>

              <Grid size={{ xs: 12, lg: 8 }} sx={{ display: 'flex' }}>
                <AppMonthlyAmount
                  title={t('companyAnalytics.monthlyCost')}
                  subheader={t('dashboard.year', { year: companyAnalytics?.monthly_cost.year ?? data?.year })}
                  totalLabel={t('companyAnalytics.yearlyTotal')}
                  categories={monthCategories}
                  series={companyAnalytics?.monthly_cost.values ?? Array(12).fill(0)}
                  sx={{ width: 1, height: 1 }}
                />
              </Grid>
            </Grid>
          ) : (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, lg: 4 }} sx={{ display: 'flex' }}>
                <AppTodayOrderStatuses
                  title={t('kitchenAnalytics.todayOrderStatuses')}
                  subheader={t('kitchenAnalytics.today')}
                  emptyText={t('kitchenAnalytics.noOrdersToday')}
                  statuses={kitchenStatusSeries}
                  sx={{ width: 1, height: 1 }}
                />
              </Grid>

              <Grid size={{ xs: 12, lg: 8 }} sx={{ display: 'flex' }}>
                <AppMonthlyRevenueSplit
                  title={t('kitchenAnalytics.monthlyRevenueAndFee')}
                  subheader={t('dashboard.year', { year: kitchenAnalytics?.monthly_net_revenue.year ?? data?.year })}
                  totalRevenueLabel={t('kitchenAnalytics.totalRevenue')}
                  kitchenShareLabel={t('kitchenAnalytics.netRevenue')}
                  systemFeeLabel={t('kitchenAnalytics.systemFee')}
                  categories={monthCategories}
                  revenue={(kitchenAnalytics?.monthly_net_revenue.values ?? Array(12).fill(0)).map(
                    (value, index) => value + (kitchenAnalytics?.monthly_system_fee.values[index] ?? 0)
                  )}
                  systemFee={kitchenAnalytics?.monthly_system_fee.values ?? Array(12).fill(0)}
                  sx={{ width: 1, height: 1 }}
                />
              </Grid>
            </Grid>
          )}
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
