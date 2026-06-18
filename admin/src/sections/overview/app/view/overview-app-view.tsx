'use client';

import type {
  DashboardRole,
  DashboardSummaryKey,
  DashboardSummaryCard,
} from 'src/lib/api/dashboard';

import { useQuery } from '@tanstack/react-query';

import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { fDateTime } from 'src/utils/format-time';
import { fNumber, fCurrency } from 'src/utils/format-number';

import { fetchDashboard } from 'src/lib/api/dashboard';
import { DashboardContent } from 'src/layouts/dashboard';

import { useAuthContext } from 'src/auth/hooks';

import { AppAreaInstalled } from '../app-area-installed';
import { AppWidgetSummary } from '../app-widget-summary';
import { AppCurrentDownload } from '../app-current-download';

// ----------------------------------------------------------------------

const MONTHS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

const SUMMARY_META: Record<
  DashboardSummaryKey,
  { title: string; color: 'primary' | 'info' | 'warning' | 'success' | 'error'; currency?: boolean }
> = {
  orders_today: { title: 'Bugungi buyurtmalar', color: 'primary' },
  delivered_today: { title: 'Bugun yetkazildi', color: 'success' },
  cancelled_today: { title: 'Bugun bekor qilindi', color: 'error' },
  orders_total: { title: 'Umumiy buyurtmalar', color: 'primary' },
  revenue_total: { title: 'Umumiy aylanma', color: 'info', currency: true },
  active_companies: { title: 'Faol kompaniyalar', color: 'success' },
  companies_total: { title: 'Jami kompaniyalar', color: 'primary' },
  active_kitchens: { title: 'Faol oshxonalar', color: 'warning' },
  lunch_subscribers_today: { title: 'Bugungi tushlik xodimlari', color: 'primary' },
  monthly_cost: { title: 'Oylik xarajat', color: 'info', currency: true },
  delivered_total: { title: 'Yetkazilgan tushliklar', color: 'success' },
  branches_total: { title: 'Jami filiallar', color: 'warning' },
  active_employees: { title: 'Faol xodimlar', color: 'primary' },
  portions_today: { title: 'Bugungi porsiyalar', color: 'primary' },
  weekly_revenue: { title: 'Haftalik tushum', color: 'info', currency: true },
  connected_companies: { title: 'Biriktirilgan kompaniyalar', color: 'warning' },
};

const STATUS_META = [
  { key: 'created', label: 'Yangi' },
  { key: 'preparing', label: 'Tayyorlanmoqda' },
  { key: 'on_the_way', label: "Yo'lda" },
  { key: 'delivered', label: 'Yetkazildi' },
  { key: 'cancelled', label: 'Bekor qilindi' },
] as const;

const SUPER_ADMIN_HIDDEN_SUMMARY_KEYS: DashboardSummaryKey[] = [
  'orders_total',
  'active_companies',
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
        label,
        value: data.order_status_totals[key],
      }))
    : [];

  const summaryCards =
    role === 'super_admin'
      ? data?.summary.filter((card) => !SUPER_ADMIN_HIDDEN_SUMMARY_KEYS.includes(card.key))
      : data?.summary;

  const monthlyChart = data
    ? {
        categories: MONTHS,
        series: [
          {
            name: String(data.monthly_orders.year),
            data: [
              { name: 'Yetkazildi', data: data.monthly_orders.delivered },
              { name: 'Bekor qilindi', data: data.monthly_orders.cancelled },
            ],
          },
        ],
      }
    : {
        categories: MONTHS,
        series: [
          {
            name: String(new Date().getFullYear()),
            data: [
              { name: 'Yetkazildi', data: Array(12).fill(0) },
              { name: 'Bekor qilindi', data: Array(12).fill(0) },
            ],
          },
        ],
      };

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={0.75} sx={{ mb: 3 }}>
        <Typography variant="h4">
          {user?.name ? `Xush kelibsiz, ${user.name}` : 'Dashboard'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {data
            ? `${data.year}-yil statistikasi. Yangilandi: ${fDateTime(data.generated_at)}`
            : "Asosiy ko'rsatkichlar va buyurtmalar statistikasi"}
        </Typography>
      </Stack>

      {isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error instanceof Error ? error.message : "Dashboard ma'lumotlarini yuklab bo'lmadi"}
        </Alert>
      )}

      <Grid container spacing={3}>
        {isLoading
          ? Array.from({ length: 6 }, (_, index) => (
              <Grid key={index} size={{ xs: 12, sm: 6, lg: 4 }}>
                <Skeleton variant="rounded" height={152} />
              </Grid>
            ))
          : summaryCards?.map((card) => {
              const meta = SUMMARY_META[card.key];

              return (
                <Grid key={card.key} size={{ xs: 12, sm: 6, lg: 4 }}>
                  <AppWidgetSummary
                    title={meta.title}
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
            <Alert severity="info">Dashboard statistikasi hozircha mavjud emas.</Alert>
          </Grid>
        )}

        <Grid size={{ xs: 12 }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, lg: 4 }} sx={{ display: 'flex' }}>
              <AppCurrentDownload
                title="Buyurtmalar holati"
                subheader={data ? `${data.year}-yil bo'yicha` : undefined}
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
                title="Buyurtmalar dinamikasi"
                subheader={data ? `${data.monthly_orders.year}-yil, oylar kesimida` : undefined}
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
