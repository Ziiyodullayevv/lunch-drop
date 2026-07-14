import type { CardProps } from '@mui/material/Card';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import LinearProgress from '@mui/material/LinearProgress';

import { fNumber } from 'src/utils/format-number';

// ----------------------------------------------------------------------

type StatusItem = { label: string; value: number };

type Props = CardProps & {
  title: string;
  subheader: string;
  emptyText: string;
  statuses: StatusItem[];
};

export function AppTodayOrderStatuses({ title, subheader, emptyText, statuses, sx, ...other }: Props) {
  const total = statuses.reduce((sum, status) => sum + status.value, 0);

  return (
    <Card sx={sx} {...other}>
      <CardHeader title={title} subheader={subheader} sx={{ mb: 2 }} />

      {total ? (
        <Stack spacing={2.75} sx={{ px: 3, pb: 3 }}>
          {statuses.map((status, index) => (
            <Box key={status.label}>
              <Box sx={{ mb: 0.75, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                <Typography variant="body2">{status.label}</Typography>
                <Typography variant="subtitle2">{fNumber(status.value)}</Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(status.value / total) * 100}
                sx={(theme) => {
                  const colors = [
                    theme.vars.palette.primary.lighter,
                    theme.vars.palette.primary.light,
                    theme.vars.palette.primary.main,
                    theme.vars.palette.primary.dark,
                    theme.vars.palette.primary.darker,
                  ];

                  return {
                    height: 8,
                    borderRadius: 99,
                    bgcolor: theme.vars.palette.primary.lighter,
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 99,
                      bgcolor: colors[index],
                    },
                  };
                }}
              />
            </Box>
          ))}
        </Stack>
      ) : (
        <Box
          sx={{ px: 3, pb: 3, minHeight: 284, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            {emptyText}
          </Typography>
        </Box>
      )}
    </Card>
  );
}
