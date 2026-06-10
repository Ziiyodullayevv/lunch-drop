'use client';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import { useTheme } from '@mui/material/styles';
import CircularProgress from '@mui/material/CircularProgress';

import axios from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { useAuthContext } from 'src/auth/hooks';

import { AppAreaInstalled } from '../app-area-installed';
import { AppWidgetSummary } from '../app-widget-summary';
import { AppCurrentDownload } from '../app-current-download';

// ----------------------------------------------------------------------

type WidgetData = { total: number; percent: number; series: number[] };

type DashboardStats = {
  role: string;
  super_admin?: { orders: WidgetData; revenue: WidgetData; companies: WidgetData };
  company_admin?: { employees: WidgetData; monthly_cost: WidgetData; delivered: WidgetData };
  kitchen_admin?: { portions: WidgetData; revenue: WidgetData; companies: WidgetData };
};

type AreaSeriesItem = { name: string; data: number[] };
type AreaChartYear = { name: string; data: AreaSeriesItem[] };
type AreaChartData = {
  title: string;
  subheader: string;
  categories: string[];
  series: AreaChartYear[];
};

type DonutSlice = { label: string; value: number };
type DonutChartData = { title: string; subheader: string; series: DonutSlice[] };

const DAYS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

// ----------------------------------------------------------------------

export function OverviewAppView() {
  const theme = useTheme();
  const { user } = useAuthContext();
  const role: string = user?.role ?? '';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [areaChart, setAreaChart] = useState<AreaChartData | null>(null);
  const [donutChart, setDonutChart] = useState<DonutChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [areaLoading, setAreaLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get({ dashboard: "/api/v1/super-admin/dashboard", areaChart: "/api/v1/stats/area-chart", donutChart: "/api/v1/stats/donut-chart" }.dashboard);
      setStats(res.data);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  const fetchAreaChart = useCallback(async () => {
    try {
      const res = await axios.get({ dashboard: "/api/v1/super-admin/dashboard", areaChart: "/api/v1/stats/area-chart", donutChart: "/api/v1/stats/donut-chart" }.areaChart);
      setAreaChart(res.data);
    } catch { /* ignore */ } finally {
      setAreaLoading(false);
    }
  }, []);

  const fetchDonutChart = useCallback(async () => {
    try {
      const res = await axios.get({ dashboard: "/api/v1/super-admin/dashboard", areaChart: "/api/v1/stats/area-chart", donutChart: "/api/v1/stats/donut-chart" }.donutChart);
      setDonutChart(res.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchAreaChart();
    fetchDonutChart();
  }, [fetchStats, fetchAreaChart, fetchDonutChart]);

  // ── role-based widget cards ───────────────────────────────────────────────

  const renderWidgets = () => {
    if (loading) {
      return (
        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        </Grid>
      );
    }

    if (role === 'super_admin' && stats?.super_admin) {
      const { orders, revenue, companies } = stats.super_admin;
      return (
        <>
          <Grid size={{ xs: 12, md: 4 }}>
            <AppWidgetSummary
              title="Umumiy buyurtmalar"
              percent={orders.percent}
              total={orders.total}
              chart={{ categories: DAYS, series: orders.series }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <AppWidgetSummary
              title="Tizimdagi aylanma"
              percent={revenue.percent}
              total={revenue.total}
              chart={{ colors: [theme.palette.info.main], categories: DAYS, series: revenue.series }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <AppWidgetSummary
              title="Faol kompaniyalar"
              percent={companies.percent}
              total={companies.total}
              chart={{ colors: [theme.palette.warning.main], categories: DAYS, series: companies.series }}
            />
          </Grid>
        </>
      );
    }

    if (role === 'company_admin' && stats?.company_admin) {
      const { employees, monthly_cost, delivered } = stats.company_admin;
      return (
        <>
          <Grid size={{ xs: 12, md: 4 }}>
            <AppWidgetSummary
              title="Tushlikka yozilgan xodimlar"
              percent={employees.percent}
              total={employees.total}
              chart={{ categories: DAYS, series: employees.series }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <AppWidgetSummary
              title="Oylik xarajat"
              percent={monthly_cost.percent}
              total={monthly_cost.total}
              chart={{ colors: [theme.palette.info.main], categories: DAYS, series: monthly_cost.series }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <AppWidgetSummary
              title="Yetkazib berilgan tushliklar"
              percent={delivered.percent}
              total={delivered.total}
              chart={{ colors: [theme.palette.success.main], categories: DAYS, series: delivered.series }}
            />
          </Grid>
        </>
      );
    }

    if (role === 'kitchen_admin' && stats?.kitchen_admin) {
      const { portions, revenue, companies } = stats.kitchen_admin;
      return (
        <>
          <Grid size={{ xs: 12, md: 4 }}>
            <AppWidgetSummary
              title="Bugungi porsiyalar"
              percent={portions.percent}
              total={portions.total}
              chart={{ categories: DAYS, series: portions.series }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <AppWidgetSummary
              title="Haftalik tushum"
              percent={revenue.percent}
              total={revenue.total}
              chart={{ colors: [theme.palette.info.main], categories: DAYS, series: revenue.series }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <AppWidgetSummary
              title="Biriktirilgan kompaniyalar"
              percent={companies.percent}
              total={companies.total}
              chart={{ colors: [theme.palette.warning.main], categories: DAYS, series: companies.series }}
            />
          </Grid>
        </>
      );
    }

    return null;
  };

  // ── area chart ────────────────────────────────────────────────────────────

  const FALLBACK_AREA_CHART = {
    categories: ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'],
    series: [
      {
        name: String(new Date().getFullYear()),
        data: [{ name: '—', data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }],
      },
    ],
  };

  const renderAreaChart = () => {
    const hasData = !areaLoading && areaChart && areaChart.series.length > 0 &&
      areaChart.series.every((yr) => yr.data.length > 0);

    return (
      <AppAreaInstalled
        title={hasData ? areaChart!.title : 'Buyurtmalar dinamikasi'}
        sx={{ height: '100%', width: '100%' }}
        chart={
          hasData
            ? {
                categories: areaChart!.categories,
                series: areaChart!.series.map((yr) => ({
                  name: yr.name,
                  data: yr.data.map((item) => ({ name: item.name, data: item.data })),
                })),
              }
            : FALLBACK_AREA_CHART
        }
      />
    );
  };

  // ── main ──────────────────────────────────────────────────────────────────

  return (
    <DashboardContent maxWidth="xl">
      <Grid container spacing={3}>

        {renderWidgets()}

        {/* Donut chart */}
        <Grid size={{ xs: 12, md: 6, lg: 4 }} sx={{ display: 'flex' }}>
          <AppCurrentDownload
            key={donutChart?.title ?? 'loading'}
            title={donutChart?.title ?? 'Buyurtmalar holati'}
            chart={{
              series: donutChart?.series ?? [],
            }}
            sx={{ height: '100%' }}
          />
        </Grid>

        {/* Role-based area chart */}
        <Grid size={{ xs: 12, md: 6, lg: 8 }} sx={{ display: 'flex' }}>
          {renderAreaChart()}
        </Grid>


      </Grid>
    </DashboardContent>
  );
}
