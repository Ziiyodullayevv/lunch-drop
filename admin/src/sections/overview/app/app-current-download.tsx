import type { CardProps } from '@mui/material/Card';
import type { ChartOptions } from 'src/components/chart';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';

import { fNumber } from 'src/utils/format-number';

import { Chart, useChart, ChartLegends } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title?: string;
  subheader?: string;
  chart: {
    colors?: string[];
    series: {
      label: string;
      value: number;
    }[];
    options?: ChartOptions;
  };
};

export function AppCurrentDownload({ title, subheader, chart, sx, ...other }: Props) {
  const theme = useTheme();

  const chartColors = chart.colors ?? [
    theme.palette.primary.lighter,
    theme.palette.primary.light,
    theme.palette.primary.dark,
    theme.palette.primary.darker,
  ];

  const chartSeries = chart.series.map((item) => item.value);
  const hasData = chartSeries.some((value) => value > 0);

  const chartOptions = useChart({
    chart: { sparkline: { enabled: true } },
    colors: chartColors,
    labels: chart.series.map((item) => item.label),
    stroke: { width: 0 },
    tooltip: {
      y: {
        formatter: (value: number) => fNumber(value),
        title: { formatter: (seriesName: string) => `${seriesName}` },
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '72%',
          labels: {
            value: { formatter: (value: number | string) => fNumber(value) },
            total: {
              formatter: (w: {
                globals: {
                  seriesTotals: number[];
                };
              }) => {
                const sum = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                return fNumber(sum);
              },
            },
          },
        },
      },
    },
    ...chart.options,
  });

  return (
    <Card sx={sx} {...other}>
      <CardHeader title={title} subheader={subheader} />

      {hasData ? (
        <Chart
          type="donut"
          series={chartSeries}
          options={chartOptions}
          sx={{
            my: 6,
            mx: 'auto',
            width: { xs: 240, xl: 260 },
            height: { xs: 240, xl: 260 },
          }}
        />
      ) : (
        <Box
          sx={{
            mx: 'auto',
            my: 6,
            width: { xs: 240, xl: 260 },
            height: { xs: 240, xl: 260 },
            display: 'flex',
            borderRadius: '50%',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.neutral',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Buyurtmalar mavjud emas
          </Typography>
        </Box>
      )}

      <Divider sx={{ borderStyle: 'dashed' }} />

      <ChartLegends
        labels={chartOptions?.labels}
        colors={chartOptions?.colors}
        sx={{ p: 3, justifyContent: 'center' }}
      />
    </Card>
  );
}
