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
import { AppAreaInstalled } from '../app-area-installed';
import { AppWidgetSummary } from '../app-widget-summary';
import { AppCurrentDownload } from '../app-current-download';
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
  portions_today: { title: 'portionsToday', color: 'primary' },
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
  'pending_admin_approvals',
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

  const statusSeries = data
    ? STATUS_META.map(({ key, label }) => ({
        label: t(`dashboard.status.${label}`),
        value: data.order_status_totals[key],
      }))
    : [];

  const summaryCards =
    role === 'super_admin'
      ? data?.summary.filter((card) => SUPER_ADMIN_SUMMARY_KEYS.includes(card.key))
      : data?.summary;

  const summarySkeletonCount = role === 'super_admin' ? 3 : 6;

  const monthlyChart = data
    ? {
        categories: MONTH_KEYS.map((key) => t(`dashboard.months.${key}`)),
        series: [
          {
            name: String(data.monthly_orders.year),
            data: [
              { name: t('dashboard.status.delivered'), data: data.monthly_orders.delivered },
              { name: t('dashboard.status.cancelled'), data: data.monthly_orders.cancelled },
            ],
          },
        ],
      }
    : {
        categories: MONTH_KEYS.map((key) => t(`dashboard.months.${key}`)),
        series: [
          {
            name: String(new Date().getFullYear()),
            data: [
              { name: t('dashboard.status.delivered'), data: Array(12).fill(0) },
              { name: t('dashboard.status.cancelled'), data: Array(12).fill(0) },
            ],
          },
        ],
      };

  const featuredItems = role ? getDashboardFeaturedItems(role, t) : [];

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
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, lg: 4 }} sx={{ display: 'flex' }}>
              <AppCurrentDownload
                title={t('dashboard.orderStatus')}
                subheader={data ? t('dashboard.year', { year: data.year }) : undefined}
                chart={{
                  colors: [
                    theme.palette.grey[400],
                    theme.palette.warning.main,
                    theme.palette.info.main,
                    theme.palette.success.main,
                    theme.palette.error.main,
                  ],
                  series: statusSeries,
                }}
                sx={{ width: 1, height: 1 }}
              />
            </Grid>

            <Grid size={{ xs: 12, lg: 8 }} sx={{ display: 'flex' }}>
              <AppAreaInstalled
                title={t('dashboard.orderTrend')}
                subheader={data ? t('dashboard.monthly', { year: data.monthly_orders.year }) : undefined}
                chart={{
                  colors: [theme.palette.success.main, theme.palette.error.main],
                  ...monthlyChart,
                }}
                sx={{ width: 1, height: 1 }}
              />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
