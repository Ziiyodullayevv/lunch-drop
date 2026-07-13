import type { IInvoice } from 'src/types/invoice';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Scrollbar } from 'src/components/scrollbar';

import { InvoiceToolbar } from './invoice-toolbar';
import { InvoiceTotalSummary } from './invoice-total-summary';

// ----------------------------------------------------------------------

type Props = {
  invoice?: IInvoice;
};

export function InvoiceDetails({ invoice }: Props) {
  const currentStatus = invoice?.status ?? '';

  const renderFooter = () => (
    <Box
      sx={{
        py: 3,
        gap: 2,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      <div>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          IZOH
        </Typography>
        <Typography variant="body2">
          Hisob-faktura tanlangan davrdagi yetkazilgan buyurtmalar asosida shakllantirilgan.
        </Typography>
      </div>

      <Box sx={{ flexGrow: { md: 1 }, textAlign: { md: 'right' } }}>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Savol bo‘lsa
        </Typography>
        <Typography variant="body2">LunchDrop administratoriga murojaat qiling</Typography>
      </Box>
    </Box>
  );

  const renderList = () => (
    <Scrollbar sx={{ mt: 5 }}>
      <Table sx={{ minWidth: 960 }}>
        <TableHead>
          <TableRow>
            <TableCell width={40}>#</TableCell>
            <TableCell sx={{ typography: 'subtitle2' }}>Filial</TableCell>
            <TableCell>Buyurtmalar</TableCell>
            <TableCell align="right">O‘rtacha narx</TableCell>
            <TableCell align="right">Jami</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {invoice?.items.map((row, index) => (
            <TableRow key={index}>
              <TableCell>{index + 1}</TableCell>

              <TableCell>
                <Box sx={{ maxWidth: 560 }}>
                  <Typography variant="subtitle2">{row.title}</Typography>

                  <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
                    {row.description}
                  </Typography>
                </Box>
              </TableCell>

              <TableCell>{row.quantity}</TableCell>
              <TableCell align="right">{fCurrency(row.price)}</TableCell>
              <TableCell align="right">{fCurrency(row.total)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Scrollbar>
  );

  return (
    <>
      <InvoiceToolbar invoice={invoice} currentStatus={currentStatus} />

      <Card sx={{ pt: 5, px: 5 }}>
        <Box
          sx={{
            rowGap: 5,
            display: 'grid',
            alignItems: 'center',
            gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
          }}
        >
          <Box
            component="img"
            alt="Invoice logo"
            src="/logo/logo-single.svg"
            sx={{ width: 48, height: 48 }}
          />

          <Stack spacing={1} sx={{ alignItems: { xs: 'flex-start', md: 'flex-end' } }}>
            <Label
              variant="soft"
              color={
                (currentStatus === 'paid' && 'success') ||
                (currentStatus === 'pending' && 'warning') ||
                (currentStatus === 'overdue' && 'error') ||
                'default'
              }
            >
              {currentStatus === 'paid' ? 'To‘langan' : 'Kutilmoqda'}
            </Label>

            <Typography variant="h6">{invoice?.invoiceNumber}</Typography>
          </Stack>

          <Stack sx={{ typography: 'body2' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Kimdan
            </Typography>
            {invoice?.invoiceFrom.name}
            <br />
            {invoice?.invoiceFrom.fullAddress}
            <br />
            Phone: {invoice?.invoiceFrom.phoneNumber}
            <br />
          </Stack>

          <Stack sx={{ typography: 'body2' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Kimga
            </Typography>
            {invoice?.invoiceTo.name}
            <br />
            {invoice?.invoiceTo.fullAddress}
            <br />
            Phone: {invoice?.invoiceTo.phoneNumber}
            <br />
          </Stack>

          <Stack sx={{ typography: 'body2' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Davr boshlanishi
            </Typography>
            {fDate(invoice?.createDate)}
          </Stack>

          <Stack sx={{ typography: 'body2' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Davr tugashi
            </Typography>
            {fDate(invoice?.dueDate)}
          </Stack>
        </Box>

        {renderList()}

        {!!invoice?.employeeSummaries?.length && (
          <>
            <Typography variant="h6" sx={{ mt: 5, mb: 2 }}>
              Buyurtmachilar kesimida
            </Typography>
            <Scrollbar>
              <Table sx={{ minWidth: 760 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Buyurtmachi</TableCell>
                    <TableCell>Filial</TableCell>
                    <TableCell align="center">Buyurtmalar</TableCell>
                    <TableCell align="right">Jami</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoice.employeeSummaries.map((employee) => (
                    <TableRow key={employee.employee_id}>
                      <TableCell>{employee.employee_name ?? 'Foydalanuvchi'}</TableCell>
                      <TableCell>{employee.branch_name}</TableCell>
                      <TableCell align="center">{employee.order_count}</TableCell>
                      <TableCell align="right">{fCurrency(Number(employee.total_amount))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Scrollbar>
          </>
        )}

        <Divider sx={{ borderStyle: 'dashed' }} />

        <InvoiceTotalSummary
          taxes={invoice?.taxes}
          subtotal={invoice?.subtotal}
          discount={invoice?.discount}
          shipping={invoice?.shipping}
          totalAmount={invoice?.totalAmount}
        />

        <Divider sx={{ mt: 5, borderStyle: 'dashed' }} />

        {renderFooter()}
      </Card>
    </>
  );
}
