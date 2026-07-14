import type { CardProps } from '@mui/material/Card';
import type { DashboardTopCompany } from 'src/lib/api/dashboard';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import LinearProgress from '@mui/material/LinearProgress';

import { fNumber, fCurrency } from 'src/utils/format-number';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title: string;
  subheader: string;
  emptyText: string;
  ordersLabel: string;
  list: DashboardTopCompany[];
};

export function AppTopCompanies({ title, subheader, emptyText, ordersLabel, list, sx, ...other }: Props) {
  const maxFee = Math.max(...list.map((item) => item.system_fee), 1);

  return (
    <Card sx={sx} {...other}>
      <CardHeader title={title} subheader={subheader} sx={{ mb: 2 }} />

      {list.length ? (
        <Stack spacing={3} sx={{ px: 3, pb: 3 }}>
          {list.map((item, index) => (
            <Box key={item.company_id}>
              <Box sx={{ gap: 1.5, mb: 1.25, display: 'flex', alignItems: 'center' }}>
                <Box
                  sx={(theme) => ({
                    width: 28,
                    height: 28,
                    display: 'flex',
                    flexShrink: 0,
                    borderRadius: '50%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: theme.vars.palette.primary.light,
                    color: theme.vars.palette.primary.darker,
                    typography: 'subtitle2',
                  })}
                >
                  {index + 1}
                </Box>

                <Box sx={{ minWidth: 0, flex: '1 1 auto' }}>
                  <Typography variant="subtitle2" noWrap>
                    {item.company_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {fNumber(item.delivered_orders)} {ordersLabel} · {fCurrency(item.revenue)}
                  </Typography>
                </Box>

                <Typography variant="subtitle2" sx={{ color: 'primary.dark', whiteSpace: 'nowrap' }}>
                  {fCurrency(item.system_fee)}
                </Typography>
              </Box>

              <LinearProgress
                variant="determinate"
                value={item.system_fee / maxFee * 100}
                sx={(theme) => ({
                  height: 7,
                  borderRadius: 99,
                  bgcolor: theme.vars.palette.primary.lighter,
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 99,
                    bgcolor: theme.vars.palette.primary.main,
                  },
                })}
              />
            </Box>
          ))}
        </Stack>
      ) : (
        <Box
          sx={{
            px: 3,
            pb: 3,
            minHeight: 272,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            {emptyText}
          </Typography>
        </Box>
      )}
    </Card>
  );
}
