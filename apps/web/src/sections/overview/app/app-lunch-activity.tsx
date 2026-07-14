import type { CardProps } from '@mui/material/Card';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title: string;
  subheader: string;
  emptyText: string;
  categories: string[];
  series: number[];
};

export function AppLunchActivity({ title, subheader, emptyText, categories, series, sx, ...other }: Props) {
  const theme = useTheme();
  const hasData = series.some((value) => value > 0);
  const chartOptions = useChart({
    chart: { toolbar: { show: false } },
    colors: [theme.vars.palette.primary.main],
    stroke: { width: 3, curve: 'smooth' },
    xaxis: { categories },
    yaxis: { min: 0, forceNiceScale: true, decimalsInFloat: 0 },
    tooltip: { y: { formatter: (value: number) => String(value) } },
    grid: { strokeDashArray: 3 },
  });

  return (
    <Card sx={sx} {...other}>
      <CardHeader title={title} subheader={subheader} />

      {hasData ? (
        <Chart
          type="line"
          series={[{ name: title, data: series }]}
          options={chartOptions}
          sx={{ px: 1, pt: 5, pb: 2, height: 345 }}
        />
      ) : (
        <Box
          sx={{ px: 3, minHeight: 345, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            {emptyText}
          </Typography>
        </Box>
      )}
    </Card>
  );
}
