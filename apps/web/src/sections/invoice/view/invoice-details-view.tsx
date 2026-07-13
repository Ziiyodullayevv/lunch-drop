'use client';

import type { IInvoice } from 'src/types/invoice';
import type { InvoiceStatus, InvoiceCustomerDetailRead } from 'src/lib/api/orders';

import dayjs from 'dayjs';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { useTranslate } from 'src/locales';
import { orderItemsLabel } from 'src/lib/api/orders';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';

import { useInvoiceCustomer, useUpdateInvoiceCustomerStatus } from '../hooks/use-invoices';

const InvoicePDFDownload = dynamic(
  () => import('../invoice-pdf').then((mod) => mod.InvoicePDFDownload),
  { ssr: false }
);

const InvoicePDFViewer = dynamic(
  () => import('../invoice-pdf').then((mod) => mod.InvoicePDFViewer),
  { ssr: false }
);

type Props = {
  employeeId: string;
  month?: string;
};

const DEMO_EMPLOYEES = {
  'demo-employee-1': {
    name: 'Akobir Ziyodullayev',
    phone: '+998 90 123 45 67',
    branch: 'Chilonzor filiali',
    count: 10,
    amount: 300000,
  },
  'demo-employee-2': {
    name: 'Madina Karimova',
    phone: '+998 91 234 56 78',
    branch: 'Chilonzor filiali',
    count: 8,
    amount: 240000,
  },
  'demo-employee-3': {
    name: 'Sardor Aliyev',
    phone: '+998 93 345 67 89',
    branch: 'Yunusobod filiali',
    count: 11,
    amount: 330000,
  },
} as const;

function buildDemo(
  employeeId: keyof typeof DEMO_EMPLOYEES,
  month: string
): InvoiceCustomerDetailRead {
  const employee = DEMO_EMPLOYEES[employeeId];
  const isJuly = month.startsWith('2026-07');
  const count = isJuly ? employee.count : 0;
  const amount = isJuly ? employee.amount : 0;
  const unitPrice = count ? amount / count : 0;

  return {
    company_id: employeeId === 'demo-employee-3' ? 'demo-company-2' : 'demo-company-1',
    company_name: employeeId === 'demo-employee-3' ? 'Najot Ta’lim' : 'Mars IT',
    employee_id: employeeId,
    employee_name: employee.name,
    employee_phone: employee.phone,
    employee_avatar_url: null,
    branch_names: [employee.branch],
    period_month: month,
    order_count: count,
    total_amount: String(amount),
    status: 'pending',
    orders: Array.from({ length: count }, (_, index) => ({
      id: `demo-order-${employeeId}-${index + 1}`,
      employee_id: employeeId,
      kitchen_id: 'demo-kitchen',
      meal_id: `demo-meal-${index + 1}`,
      target_date: dayjs(month)
        .add(index % 28, 'day')
        .format('YYYY-MM-DD'),
      historical_price: String(unitPrice),
      system_fee: String(unitPrice * 0.03),
      status: 'delivered',
      created_at: dayjs(month)
        .add(index % 28, 'day')
        .toISOString(),
      employee_name: employee.name,
      employee_phone: employee.phone,
      employee_avatar_url: null,
      branch_id: 'demo-branch',
      branch_name: employee.branch,
      company_id: 'demo-company',
      company_name: 'Mars IT',
      kitchen_name: 'Demo Kitchen',
      meal_name: index % 2 ? 'Uygur Shashlik' : 'Uygur Lag‘mon',
      meal_image_url: null,
      items: [],
    })),
  };
}

export function InvoiceDetailsView({ employeeId, month }: Props) {
  const { t } = useTranslate('common');
  const preview = useBoolean();
  const { user } = useAuthContext();
  const scope = user?.role === 'super_admin' ? 'super_admin' : 'company';
  const monthParam = dayjs(month).isValid()
    ? dayjs(month).startOf('month').format('YYYY-MM-DD')
    : dayjs().startOf('month').format('YYYY-MM-DD');
  const demoEmployee = DEMO_EMPLOYEES[employeeId as keyof typeof DEMO_EMPLOYEES];
  const isDemo = process.env.NODE_ENV === 'development' && !!demoEmployee;
  const customerQuery = useInvoiceCustomer(employeeId, monthParam, scope, !isDemo);
  const updateStatus = useUpdateInvoiceCustomerStatus(monthParam, scope);
  const [demoStatus, setDemoStatus] = useState<InvoiceStatus>('pending');
  const demoCustomer = useMemo(
    () => (isDemo ? buildDemo(employeeId as keyof typeof DEMO_EMPLOYEES, monthParam) : null),
    [employeeId, isDemo, monthParam]
  );
  const customer = useMemo(
    () => (demoCustomer ? { ...demoCustomer, status: demoStatus } : customerQuery.data),
    [customerQuery.data, demoCustomer, demoStatus]
  );

  const handleStatus = async (status: InvoiceStatus) => {
    if (isDemo) {
      setDemoStatus(status);
      toast.success(t('invoiceCustomers.paymentUpdated'));
      return;
    }
    try {
      await updateStatus.mutateAsync({ employeeId, status });
      toast.success(t('invoiceCustomers.paymentUpdated'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('invoiceCustomers.updateError'));
    }
  };

  const name = customer?.employee_name ?? 'Xodim';
  const invoiceNumber = `INV-${employeeId.slice(0, 8).toUpperCase()}-${dayjs(monthParam).format('YYYYMM')}`;
  const pdfInvoice = useMemo<IInvoice | undefined>(() => {
    if (!customer) return undefined;

    return {
      id: customer.employee_id,
      sent: 0,
      taxes: 0,
      discount: 0,
      shipping: 0,
      status: customer.status,
      createDate: monthParam,
      dueDate: dayjs(monthParam).endOf('month').format('YYYY-MM-DD'),
      invoiceNumber,
      subtotal: Number(customer.total_amount),
      totalAmount: Number(customer.total_amount),
      invoiceFrom: {
        id: customer.company_id,
        name: customer.company_name,
        company: customer.company_name,
        fullAddress: customer.branch_names.join(', '),
      },
      invoiceTo: {
        id: customer.employee_id,
        name: customer.employee_name ?? 'Xodim',
        company: customer.company_name,
        phoneNumber: customer.employee_phone,
        fullAddress: customer.branch_names.join(', '),
      },
      items: customer.orders.map((order) => {
        const quantity = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 1;
        const total = Number(order.historical_price);

        return {
          id: order.id,
          service: 'order',
          quantity,
          total,
          price: total / quantity,
          title: orderItemsLabel(order),
          description: `${fDate(order.target_date)} · ${order.branch_name ?? '—'} · ${order.kitchen_name ?? '—'}`,
        };
      }),
    };
  }, [customer, invoiceNumber, monthParam]);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={invoiceNumber}
        backHref={paths.dashboard.invoice.root}
        links={[
          { name: t('navigation.dashboard'), href: paths.dashboard.root },
          { name: t('invoiceCustomers.title'), href: paths.dashboard.invoice.root },
          { name: invoiceNumber },
        ]}
        sx={{ mb: 3 }}
      />

      {customerQuery.isLoading ? (
        <Box sx={{ py: 10, textAlign: 'center' }}>
          <CircularProgress />
        </Box>
      ) : customerQuery.isError && !isDemo ? (
        <Alert severity="error">
          {customerQuery.error instanceof Error
            ? customerQuery.error.message
            : t('invoiceCustomers.loadError')}
        </Alert>
      ) : !customer ? (
        <Alert severity="warning">{t('invoiceCustomers.notFound')}</Alert>
      ) : (
        <>
          <Box
            sx={{
              gap: 3,
              display: 'flex',
              mb: { xs: 3, md: 5 },
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-end', sm: 'center' },
            }}
          >
            <Box sx={{ gap: 1, width: 1, flexGrow: 1, display: 'flex' }}>
              <Tooltip title={t('invoiceCustomers.view')}>
                <IconButton onClick={preview.onTrue} disabled={!pdfInvoice}>
                  <Iconify icon="solar:eye-bold" />
                </IconButton>
              </Tooltip>
              {pdfInvoice && (
                <InvoicePDFDownload invoice={pdfInvoice} currentStatus={customer.status} />
              )}
            </Box>

            <TextField
              select
              label={t('invoiceCustomers.status')}
              value={customer.status}
              disabled={updateStatus.isPending}
              onChange={(event) => handleStatus(event.target.value as InvoiceStatus)}
              sx={{ width: 180 }}
            >
              <MenuItem value="paid">{t('invoiceCustomers.paid')}</MenuItem>
              <MenuItem value="pending">{t('invoiceCustomers.pending')}</MenuItem>
            </TextField>
          </Box>

          <Card sx={{ pt: 5, px: { xs: 3, md: 5 } }}>
            <Box
              sx={{
                rowGap: 5,
                display: 'grid',
                alignItems: 'center',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
              }}
            >
              <Box
                component="img"
                alt="LunchDrop"
                src="/logo/logo-single.svg"
                sx={{ width: 48, height: 48 }}
              />

              <Stack spacing={1} sx={{ alignItems: { xs: 'flex-start', sm: 'flex-end' } }}>
                <Label variant="soft" color={customer.status === 'paid' ? 'success' : 'warning'}>
                  {t(`invoiceCustomers.${customer.status}`)}
                </Label>
                <Typography variant="h6">{invoiceNumber}</Typography>
              </Stack>

              <Stack sx={{ typography: 'body2' }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {t('invoiceCustomers.from')}
                </Typography>
                <Typography>{customer.company_name}</Typography>
                <Typography color="text.secondary">
                  {customer.branch_names.join(', ') || '—'}
                </Typography>
              </Stack>

              <Stack sx={{ typography: 'body2' }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {t('invoiceCustomers.to')}
                </Typography>
                <Typography>{name}</Typography>
                <Typography color="text.secondary">
                  {customer.branch_names.join(', ') || '—'}
                </Typography>
                <Typography color="text.secondary">{customer.employee_phone}</Typography>
              </Stack>

              <Stack sx={{ typography: 'body2' }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {t('invoiceCustomers.periodStart')}
                </Typography>
                {fDate(monthParam)}
              </Stack>

              <Stack sx={{ typography: 'body2' }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {t('invoiceCustomers.periodEnd')}
                </Typography>
                {fDate(dayjs(monthParam).endOf('month').format('YYYY-MM-DD'))}
              </Stack>
            </Box>

            <Scrollbar sx={{ mt: 5 }}>
              <Table sx={{ minWidth: 900 }}>
                <TableHead>
                  <TableRow>
                    <TableCell width={40}>#</TableCell>
                    <TableCell sx={{ typography: 'subtitle2' }}>
                      {t('invoiceCustomers.description')}
                    </TableCell>
                    <TableCell>{t('invoiceCustomers.quantity')}</TableCell>
                    <TableCell align="right">{t('invoiceCustomers.unitPrice')}</TableCell>
                    <TableCell align="right">{t('invoiceCustomers.total')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {customer.orders.map((order, index) => {
                    const quantity =
                      order.items?.reduce((sum, item) => sum + item.quantity, 0) || 1;
                    const total = Number(order.historical_price);
                    return (
                      <TableRow key={order.id} hover>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <ListItemText
                            primary={orderItemsLabel(order)}
                            secondary={`${fDate(order.target_date)} · ${order.branch_name ?? '—'} · ${order.kitchen_name ?? '—'}`}
                          />
                        </TableCell>
                        <TableCell>{quantity}</TableCell>
                        <TableCell align="right">
                          {fCurrency(total / quantity, { currency: 'UZS' })}
                        </TableCell>
                        <TableCell align="right">{fCurrency(total, { currency: 'UZS' })}</TableCell>
                      </TableRow>
                    );
                  })}
                  {!customer.orders.length && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                        {t('invoiceCustomers.noOrders')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Scrollbar>

            <Divider sx={{ borderStyle: 'dashed' }} />

            <Box
              sx={{
                mt: 3,
                gap: 2,
                display: 'flex',
                textAlign: 'right',
                alignItems: 'flex-end',
                flexDirection: 'column',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', typography: 'subtitle1' }}>
                <Box component="span">{t('invoiceCustomers.total')}</Box>
                <Box component="span" sx={{ width: 180, fontWeight: 700 }}>
                  {fCurrency(Number(customer.total_amount), { currency: 'UZS' })}
                </Box>
              </Box>
            </Box>

            <Divider sx={{ mt: 5, borderStyle: 'dashed' }} />

            <Box
              sx={{
                py: 3,
                gap: 2,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  {t('invoiceCustomers.notes')}
                </Typography>
                <Typography variant="body2">{t('invoiceCustomers.notesText')}</Typography>
              </Box>
              <Box sx={{ flexGrow: { md: 1 }, textAlign: { md: 'right' } }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  {t('invoiceCustomers.question')}
                </Typography>
                <Typography variant="body2">{t('invoiceCustomers.support')}</Typography>
              </Box>
            </Box>
          </Card>

          <Dialog fullScreen open={preview.value} onClose={preview.onFalse}>
            <Box sx={{ height: 1, display: 'flex', flexDirection: 'column' }}>
              <DialogActions sx={{ p: 1.5 }}>
                <Button color="inherit" variant="contained" onClick={preview.onFalse}>
                  {t('invoiceCustomers.close')}
                </Button>
              </DialogActions>
              <Box sx={{ flexGrow: 1, height: 1, overflow: 'hidden' }}>
                {pdfInvoice && (
                  <InvoicePDFViewer invoice={pdfInvoice} currentStatus={customer.status} />
                )}
              </Box>
            </Box>
          </Dialog>
        </>
      )}
    </DashboardContent>
  );
}
