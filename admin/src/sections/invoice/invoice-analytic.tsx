import type { ReactNode } from 'react';
import type { IconifyName } from 'src/components/iconify';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { fCurrency, fShortenNumber } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  title: string;
  total: number;
  price: number;
  color?: string;
  percent: number;
  icon: IconifyName | ReactNode;
  unit?: string;
  currency?: string;
};

export function InvoiceAnalytic({ title, total, icon, color, percent, price, unit = 'invoices', currency }: Props) {
  const renderIcon =
    typeof icon === 'string' ? (
      <Iconify icon={icon as IconifyName} width={32} sx={{ color, position: 'absolute' }} />
    ) : (
      <Box sx={{ color, position: 'absolute', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
        {icon}
      </Box>
    );

  return (
    <Box
      sx={{
        width: 1,
        gap: 2.5,
        minWidth: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          position: 'relative',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {renderIcon}

        <CircularProgress
          size={56}
          thickness={2}
          value={percent}
          variant="determinate"
          sx={{ color, opacity: 0.48 }}
        />

        <CircularProgress
          size={56}
          value={100}
          thickness={3}
          variant="determinate"
          sx={[
            (theme) => ({
              top: 0,
              left: 0,
              opacity: 0.48,
              position: 'absolute',
              color: varAlpha(theme.vars.palette.grey['500Channel'], 0.16),
            }),
          ]}
        />
      </Box>

      <div>
        <Typography variant="subtitle1">{title}</Typography>

        <Box
          component="span"
          sx={{ my: 0.5, display: 'block', typography: 'body2', color: 'text.disabled' }}
        >
          {fShortenNumber(total)} {unit}
        </Box>

        <Box component="span" sx={{ typography: 'subtitle2' }}>
          {fCurrency(price, currency ? { currency } : undefined)}
        </Box>
      </div>
    </Box>
  );
}
