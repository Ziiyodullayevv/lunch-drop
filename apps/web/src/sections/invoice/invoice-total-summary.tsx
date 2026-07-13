import type { BoxProps } from '@mui/material/Box';
import type { Theme, SxProps } from '@mui/material/styles';

import Box from '@mui/material/Box';

import { fCurrency } from 'src/utils/format-number';

// ----------------------------------------------------------------------

type InvoiceTotalSummaryProps = BoxProps & {
  taxes?: number;
  shipping?: number;
  subtotal?: number;
  discount?: number;
  totalAmount?: number;
};

export function InvoiceTotalSummary({
  sx,
  taxes,
  shipping,
  subtotal,
  discount,
  totalAmount,
  ...other
}: InvoiceTotalSummaryProps) {
  const rowStyles: SxProps<Theme> = {
    display: 'flex',
    alignItems: 'center',
  };

  const labelStyles: SxProps<Theme> = {
    color: 'text.secondary',
  };

  const valueStyles: SxProps<Theme> = {
    width: 160,
  };

  return (
    <Box
      sx={[
        {
          mt: 3,
          gap: 2,
          display: 'flex',
          textAlign: 'right',
          typography: 'body2',
          alignItems: 'flex-end',
          flexDirection: 'column',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Box sx={rowStyles}>
        <Box component="span" sx={labelStyles}>
          Oshxona foydasi
        </Box>
        <Box component="span" sx={[valueStyles, { fontWeight: 'fontWeightSemiBold' }]}>
          {fCurrency(subtotal) || '-'}
        </Box>
      </Box>

      <Box sx={rowStyles}>
        <Box component="span" sx={labelStyles}>
          Yetkazib berish
        </Box>
        <Box component="span" sx={[{ ...valueStyles }, !!shipping && { color: 'error.main' }]}>
          {shipping ? `- ${fCurrency(shipping)}` : '-'}
        </Box>
      </Box>

      <Box sx={rowStyles}>
        <Box component="span" sx={labelStyles}>
          Chegirma
        </Box>

        <Box component="span" sx={[{ ...valueStyles }, !!discount && { color: 'error.main' }]}>
          {discount ? `- ${fCurrency(discount)}` : '-'}
        </Box>
      </Box>

      <Box sx={rowStyles}>
        <Box component="span" sx={labelStyles}>
          Tizim xizmati
        </Box>
        <Box component="span" sx={valueStyles}>
          {taxes ? fCurrency(taxes) : '-'}
        </Box>
      </Box>

      <Box sx={[rowStyles, { typography: 'subtitle1' }]}>
        <Box component="span">Jami</Box>
        <Box component="span" sx={valueStyles}>
          {fCurrency(totalAmount) || '-'}
        </Box>
      </Box>
    </Box>
  );
}
