import type { CardProps } from '@mui/material/Card';
import type { ChartOptions } from 'src/components/chart';

import { useState, useEffect, useCallback } from 'react';

import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';

import { fNumber, fShortenNumber } from 'src/utils/format-number';

import { Chart, useChart, ChartSelect, ChartLegends } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title?: string;
  subheader?: string;
  chart: {
    colors?: string[];
    categories: string[];
    series: {
      name: string;
      data: {
        name: string;
        data: number[];
      }[];
    }[];
    options?: ChartOptions;
  };
};

export function AppAreaInstalled({ title, subheader, chart, sx, ...other }: Props) {
  const theme = useTheme();

  const lastYearName = chart.series.length > 0 ? chart.series[chart.series.length - 1].name : '';
  const [selectedSeries, setSelectedSeries] = useState(lastYearName);

  // keep selectedSeries in sync when series prop changes (e.g. after fetch)
  useEffect(() => {
    if (chart.series.length > 0) {
      const names = chart.series.map((s) => s.name);
      if (!names.includes(selectedSeries)) {
        setSelectedSeries(names[names.length - 1]);
      }
    }
  }, [chart.series, selectedSeries]);

  const chartColors = chart.colors ?? [
    theme.palette.primary.dark,
    theme.palette.warning.main,
    theme.palette.info.main,
  ];

  const chartOptions = useChart({
    chart: { stacked: true },
    colors: chartColors,
    stroke: { width: 0 },
    xaxis: { categories: chart.categories },
    tooltip: { y: { formatter: (value: number) => fNumber(value) } },
    plotOptions: { bar: { columnWidth: '40%' } },
    ...chart.options,
  });

  const handleChangeSeries = useCallback((newValue: string) => {
    setSelectedSeries(newValue);
  }, []);

  const currentSeries = chart.series.find((i) => i.name === selectedSeries);
  const firstSeries = chart.series[0];

  // compute legend values: total per group across all months in the selected year
  const legendValues = currentSeries?.data.map((group) =>
    fShortenNumber(group.data.reduce((sum, v) => sum + v, 0))
  ) ?? [];

  if (!firstSeries || firstSeries.data.length === 0) {
    return (
      <Card sx={sx} {...other}>
        <CardHeader title={title} subheader={subheader} sx={{ mb: 3 }} />
      </Card>
    );
  }

  return (
    <Card sx={sx} {...other}>
      <CardHeader
        title={title}
        subheader={subheader}
        action={
          chart.series.length > 1 ? (
            <ChartSelect
              options={chart.series.map((item) => item.name)}
              value={selectedSeries}
              onChange={handleChangeSeries}
            />
          ) : null
        }
        sx={{ mb: 3 }}
      />

      <ChartLegends
        colors={chartOptions?.colors}
        labels={firstSeries.data.map((item) => item.name)}
        values={legendValues}
        sx={{ px: 3, gap: 3 }}
      />

      <Chart
        key={selectedSeries}
        type="bar"
        series={currentSeries?.data}
        options={chartOptions}
        slotProps={{ loading: { p: 2.5 } }}
        sx={{ pl: 1, py: 2.5, pr: 2.5, height: 320 }}
      />
    </Card>
  );
}
