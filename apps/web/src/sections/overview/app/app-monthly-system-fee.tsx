import type { CardProps } from '@mui/material/Card';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';

import { fCurrency, fShortCurrency } from 'src/utils/format-number';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title: string;
  subheader: string;
  totalLabel: string;
  categories: string[];
  series: number[];
};

export function AppMonthlySystemFee({
  title,
  subheader,
  totalLabel,
  categories,
  series,
  sx,
  ...other
}: Props) {
  const theme = useTheme();
  const total = series.reduce((sum, value) => sum + value, 0);
  const chartOptions = useChart({
    chart: { toolbar: { show: false } },
    colors: [theme.vars.palette.primary.main],
    stroke: { width: 0 },
    xaxis: { categories },
    yaxis: { labels: { formatter: (value: number) => fShortCurrency(value) } },
    tooltip: { y: { formatter: (value: number) => fCurrency(value) } },
    plotOptions: { bar: { borderRadius: 4, columnWidth: '42%' } },
  });

  return (
    <Card sx={sx} {...other}>
      <CardHeader title={title} subheader={subheader} />

      <Box sx={{ px: 3, pt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {totalLabel}
        </Typography>
        <Typography variant="h4" sx={{ color: 'primary.dark' }}>
          {fCurrency(total)}
        </Typography>
      </Box>

      <Chart
        type="bar"
        series={[{ name: title, data: series }]}
        options={chartOptions}
        slotProps={{ loading: { p: 2.5 } }}
        sx={{ px: 1, pt: 1, pb: 2, height: 340 }}
      />
    </Card>
  );
}
