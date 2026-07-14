import type { CardProps } from '@mui/material/Card';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';

import { fCurrency, fShortenNumber } from 'src/utils/format-number';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title: string;
  subheader: string;
  totalRevenueLabel: string;
  kitchenShareLabel: string;
  systemFeeLabel: string;
  categories: string[];
  revenue: number[];
  systemFee: number[];
};

export function AppMonthlyRevenueSplit({
  title,
  subheader,
  totalRevenueLabel,
  kitchenShareLabel,
  systemFeeLabel,
  categories,
  revenue,
  systemFee,
  sx,
  ...other
}: Props) {
  const theme = useTheme();
  const totalRevenue = revenue.reduce((sum, value) => sum + value, 0);
  const totalFee = systemFee.reduce((sum, value) => sum + value, 0);
  const kitchenShare = revenue.map((value, index) => Math.max(value - (systemFee[index] ?? 0), 0));
  const chartOptions = useChart({
    chart: { stacked: true, toolbar: { show: false } },
    colors: [theme.vars.palette.primary.dark, theme.vars.palette.warning.main],
    stroke: { width: 0 },
    xaxis: { categories },
    yaxis: { labels: { formatter: (value: number) => `${fShortenNumber(value)} so'm` } },
    tooltip: { y: { formatter: (value: number) => fCurrency(value) } },
    legend: { position: 'top', horizontalAlign: 'left' },
    plotOptions: { bar: { borderRadius: 4, columnWidth: '42%' } },
  });

  return (
    <Card sx={sx} {...other}>
      <CardHeader title={title} subheader={subheader} />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4} sx={{ px: 3, pt: 2 }}>
        <Box>
          <Typography variant="body2" color="text.secondary">
            {totalRevenueLabel}
          </Typography>
          <Typography variant="h4" sx={{ color: 'primary.dark' }}>
            {fCurrency(totalRevenue)}
          </Typography>
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">
            {systemFeeLabel}
          </Typography>
          <Typography variant="h4" sx={{ color: 'warning.dark' }}>
            {fCurrency(totalFee)}
          </Typography>
        </Box>
      </Stack>

      <Chart
        type="bar"
        series={[
          { name: kitchenShareLabel, data: kitchenShare },
          { name: systemFeeLabel, data: systemFee },
        ]}
        options={chartOptions}
        slotProps={{ loading: { p: 2.5 } }}
        sx={{ px: 1, pt: 1, pb: 2, height: 340 }}
      />
    </Card>
  );
}
