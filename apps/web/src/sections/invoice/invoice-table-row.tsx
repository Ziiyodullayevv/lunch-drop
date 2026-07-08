import type { IInvoice } from 'src/types/invoice';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Avatar from '@mui/material/Avatar';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import ListItemText from '@mui/material/ListItemText';

import { fCurrency } from 'src/utils/format-number';
import { fDate, fTime } from 'src/utils/format-time';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

type Props = {
  row: IInvoice;
};

export function InvoiceTableRow({ row }: Props) {
  return (
    <TableRow hover>
      <TableCell>
        <Box sx={{ gap: 2, display: 'flex', alignItems: 'center' }}>
          <Avatar alt={row.invoiceTo.name}>{row.invoiceTo.name.charAt(0).toUpperCase()}</Avatar>

          <ListItemText
            primary={row.invoiceTo.name}
            secondary={
              <Link color="inherit" underline="none">
                {row.invoiceNumber}
              </Link>
            }
            slotProps={{
              primary: { noWrap: true, sx: { typography: 'body2' } },
              secondary: {
                sx: { color: 'text.disabled', '&:hover': { color: 'text.secondary' } },
              },
            }}
          />
        </Box>
      </TableCell>

      <TableCell>
        <ListItemText
          primary={fDate(row.createDate)}
          secondary={fTime(row.createDate)}
          slotProps={{
            primary: { noWrap: true, sx: { typography: 'body2' } },
            secondary: { sx: { mt: 0.5, typography: 'caption' } },
          }}
        />
      </TableCell>

      <TableCell>
        <ListItemText
          primary={fDate(row.dueDate)}
          secondary={fTime(row.dueDate)}
          slotProps={{
            primary: { noWrap: true, sx: { typography: 'body2' } },
            secondary: { sx: { mt: 0.5, typography: 'caption' } },
          }}
        />
      </TableCell>

      <TableCell>{fCurrency(row.subtotal)}</TableCell>

      <TableCell>{fCurrency(row.taxes)}</TableCell>

      <TableCell>{fCurrency(row.totalAmount)}</TableCell>

      <TableCell>
        <Label
          variant="soft"
          color={
            (row.status === 'paid' && 'success') ||
            (row.status === 'pending' && 'warning') ||
            (row.status === 'overdue' && 'error') ||
            'default'
          }
        >
          {row.status}
        </Label>
      </TableCell>
    </TableRow>
  );
}
