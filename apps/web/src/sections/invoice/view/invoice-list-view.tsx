'use client';

import type { InvoiceStatus, InvoiceCustomerRead } from 'src/lib/api/orders';

import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Table from '@mui/material/Table';
import Select from '@mui/material/Select';
import Avatar from '@mui/material/Avatar';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';
import InputAdornment from '@mui/material/InputAdornment';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fCurrency } from 'src/utils/format-number';

import { CONFIG } from 'src/global-config';
import { useTranslate } from 'src/locales';
import { getImagePreviewUrl } from 'src/lib/image-url';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  TableNoData,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

import { useCompanies } from 'src/sections/company/hooks/use-companies';

import { useAuthContext } from 'src/auth/hooks';

import { InvoiceAnalytic } from '../invoice-analytic';
import { InvoiceCustomerStatusMenu } from '../invoice-customer-status-menu';
import {
  useInvoiceCustomers,
  useUpdateInvoiceCustomerStatus,
} from '../hooks/use-invoices';

const TABLE_HEAD = [
  { id: 'customer', label: 'Customer', width: 300 },
  { id: 'branches', label: 'Filiallar', width: 220 },
  { id: 'month', label: 'Oy', width: 150 },
  { id: 'orders', label: 'Buyurtmalar', width: 130, align: 'center' as const },
  { id: 'amount', label: 'Jami summa', width: 170 },
  { id: 'status', label: 'Holat', width: 210 },
  { id: 'actions', label: '', width: 64 },
];

const DEMO_CUSTOMERS = [
  { id: 'demo-employee-1', name: 'Akobir Ziyodullayev', phone: '+998 90 123 45 67', branch: 'Chilonzor filiali', count: 10, amount: 300000 },
  { id: 'demo-employee-2', name: 'Madina Karimova', phone: '+998 91 234 56 78', branch: 'Chilonzor filiali', count: 8, amount: 240000 },
  { id: 'demo-employee-3', name: 'Sardor Aliyev', phone: '+998 93 345 67 89', branch: 'Yunusobod filiali', count: 11, amount: 330000 },
];

const defaultAvatar = (name: string, id: string) => {
  const surname = name.trim().split(/\s+/).at(-1)?.toLowerCase() ?? id;
  const hash = Array.from(surname).reduce((total, char) => total + char.charCodeAt(0), 0);
  const isFemale = surname.endsWith('va');
  const index = (hash % 12) * 2 + (isFemale ? 1 : 2);
  return `${CONFIG.assetsDir}/assets/images/mock/avatar/avatar-${index}.webp`;
};

export function InvoiceListView() {
  const { t } = useTranslate('common');
  const { user } = useAuthContext();
  const isSuperAdmin = user?.role === 'super_admin';
  const scope = isSuperAdmin ? 'super_admin' : 'company';
  const router = useRouter();
  const theme = useTheme();
  const table = useTable({ defaultRowsPerPage: 10 });
  const [month, setMonth] = useState(() => dayjs().startOf('month'));
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus>('all');
  const [demoStatuses, setDemoStatuses] = useState<Record<string, InvoiceStatus>>({});
  const monthParam = month.format('YYYY-MM-DD');
  const customersQuery = useInvoiceCustomers(monthParam, scope, companyFilter || undefined);
  const updateStatus = useUpdateInvoiceCustomerStatus(monthParam, scope);
  const { data: companiesData } = useCompanies({ limit: 100 }, isSuperAdmin);
  const companies = companiesData?.items ?? [];
  const useDemo = process.env.NODE_ENV === 'development' && !customersQuery.data?.length;
  const companyOptions = useDemo
    ? [
        { id: 'demo-company-1', name: 'Mars IT' },
        { id: 'demo-company-2', name: 'Najot Ta’lim' },
      ]
    : companies;

  const customers = useMemo<InvoiceCustomerRead[]>(() => {
    if (!useDemo) return customersQuery.data ?? [];
    const hasDemoAmount = month.format('YYYY-MM') === '2026-07';
    return DEMO_CUSTOMERS.map((customer) => ({
      company_id: customer.id === 'demo-employee-3' ? 'demo-company-2' : 'demo-company-1',
      company_name: customer.id === 'demo-employee-3' ? 'Najot Ta’lim' : 'Mars IT',
      employee_id: customer.id,
      employee_name: customer.name,
      employee_phone: customer.phone,
      employee_avatar_url: null,
      branch_names: [customer.branch],
      period_month: monthParam,
      order_count: hasDemoAmount ? customer.count : 0,
      total_amount: String(hasDemoAmount ? customer.amount : 0),
      status: demoStatuses[`${monthParam}:${customer.id}`] ?? 'pending',
    }));
  }, [customersQuery.data, demoStatuses, month, monthParam, useDemo]);

  const branches = useMemo(
    () => Array.from(new Set(
      customers
        .filter((customer) => !companyFilter || customer.company_id === companyFilter)
        .flatMap((customer) => customer.branch_names)
    )).sort(),
    [companyFilter, customers]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return customers.filter((customer) => {
      if (statusFilter !== 'all' && customer.status !== statusFilter) return false;
      if (companyFilter && customer.company_id !== companyFilter) return false;
      if (branchFilter && !customer.branch_names.includes(branchFilter)) return false;
      if (!term) return true;
      return [
        customer.employee_name,
        customer.employee_phone,
        ...customer.branch_names,
      ].some((value) => value?.toLowerCase().includes(term));
    });
  }, [branchFilter, companyFilter, customers, search, statusFilter]);

  const paid = customers.filter((customer) => customer.status === 'paid');
  const pending = customers.filter((customer) => customer.status === 'pending');
  const totalAmount = customers.reduce((sum, customer) => sum + Number(customer.total_amount), 0);

  const handleStatus = async (customer: InvoiceCustomerRead, status: InvoiceStatus) => {
    if (useDemo) {
      setDemoStatuses((current) => ({
        ...current,
        [`${monthParam}:${customer.employee_id}`]: status,
      }));
      toast.success(t('invoiceCustomers.paymentUpdated'));
      return;
    }
    try {
      await updateStatus.mutateAsync({ employeeId: customer.employee_id, status });
      toast.success(t('invoiceCustomers.paymentUpdated'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('invoiceCustomers.updateError'));
    }
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={t('invoiceCustomers.title')}
        links={[
          { name: t('navigation.dashboard'), href: paths.dashboard.root },
          { name: t('invoiceCustomers.invoice') },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ mb: 3 }}>
        <Scrollbar sx={{ minHeight: 108 }}>
          <Box sx={{ display: 'flex', py: 2 }}>
            <InvoiceAnalytic title={t('invoiceCustomers.employees')} total={customers.length} percent={100} price={totalAmount} icon="solar:users-group-rounded-bold-duotone" color={theme.vars.palette.info.main} />
            <InvoiceAnalytic title={t('invoiceCustomers.paid')} total={paid.length} percent={customers.length ? paid.length / customers.length * 100 : 0} price={paid.reduce((sum, item) => sum + Number(item.total_amount), 0)} icon="solar:file-check-bold-duotone" color={theme.vars.palette.success.main} />
            <InvoiceAnalytic title={t('invoiceCustomers.pending')} total={pending.length} percent={customers.length ? pending.length / customers.length * 100 : 0} price={pending.reduce((sum, item) => sum + Number(item.total_amount), 0)} icon="solar:sort-by-time-bold-duotone" color={theme.vars.palette.warning.main} />
          </Box>
        </Scrollbar>
      </Card>

      <Card>
        <Tabs
          value={statusFilter}
          onChange={(_, value) => { setStatusFilter(value); table.onResetPage(); }}
          sx={{ px: 2.5, boxShadow: `inset 0 -2px 0 0 ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}` }}
        >
          {[
            { value: 'all', label: t('invoiceCustomers.all'), count: customers.length, color: 'default' as const },
            { value: 'paid', label: t('invoiceCustomers.paid'), count: paid.length, color: 'success' as const },
            { value: 'pending', label: t('invoiceCustomers.pending'), count: pending.length, color: 'warning' as const },
          ].map((tab) => (
            <Tab key={tab.value} value={tab.value} label={tab.label} iconPosition="end" icon={<Label variant={tab.value === statusFilter ? 'filled' : 'soft'} color={tab.color}>{tab.count}</Label>} />
          ))}
        </Tabs>

        <Box sx={{ p: 2.5, gap: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', md: isSuperAdmin ? 'repeat(3, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))' } }}>
          {isSuperAdmin && (
            <Select
              displayEmpty
              value={companyFilter}
              onChange={(event) => {
                setCompanyFilter(event.target.value);
                setBranchFilter('');
                table.onResetPage();
              }}
              renderValue={(selected) => selected
                ? companyOptions.find((company) => company.id === selected)?.name ?? selected
                : <Box component="span" sx={{ color: 'text.disabled' }}>{t('invoiceCustomers.company')}</Box>}
            >
              <MenuItem value="">{t('invoiceCustomers.allCompanies')}</MenuItem>
              {companyOptions.map((company) => (
                <MenuItem key={company.id} value={company.id}>{company.name}</MenuItem>
              ))}
            </Select>
          )}
          <DatePicker
            views={['year', 'month']}
            label={t('invoiceCustomers.month')}
            value={month}
            onChange={(value) => {
              if (value?.isValid()) {
                setMonth(value.startOf('month'));
                setBranchFilter('');
              }
              table.onResetPage();
            }}
            slotProps={{ textField: { fullWidth: true } }}
            sx={{ order: isSuperAdmin ? 3 : 2 }}
          />
          <Select
            displayEmpty
            value={branchFilter}
            onChange={(event) => {
              setBranchFilter(event.target.value);
              table.onResetPage();
            }}
            renderValue={(selected) => selected || (
              <Box component="span" sx={{ color: 'text.disabled' }}>{t('invoiceCustomers.branch')}</Box>
            )}
            sx={{ width: 1, order: isSuperAdmin ? 2 : 1 }}
          >
            <MenuItem value="">{t('invoiceCustomers.allBranches')}</MenuItem>
            {branches.map((branch) => (
              <MenuItem key={branch} value={branch}>{branch}</MenuItem>
            ))}
          </Select>
          <TextField
            fullWidth
            value={search}
            onChange={(event) => { setSearch(event.target.value); table.onResetPage(); }}
            placeholder={t('invoiceCustomers.search')}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} /></InputAdornment> } }}
            sx={{ gridColumn: '1 / -1', order: 4 }}
          />
        </Box>

        <Scrollbar sx={{ minHeight: 444 }}>
          <Table sx={{ minWidth: 980 }}>
            <TableHeadCustom
              headCells={TABLE_HEAD.map((cell) => ({
                ...cell,
                label: cell.id === 'actions' ? '' : t(`invoiceCustomers.${cell.id}`),
              }))}
            />
            <TableBody>
              {customersQuery.isLoading ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 8 }}><CircularProgress /></TableCell></TableRow>
              ) : filtered.slice(table.page * table.rowsPerPage, table.page * table.rowsPerPage + table.rowsPerPage).map((customer) => {
                const name = customer.employee_name ?? 'Foydalanuvchi';
                return (
                  <TableRow key={customer.employee_id} hover>
                    <TableCell>
                      <Box sx={{ minWidth: 260, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar src={customer.employee_avatar_url ? getImagePreviewUrl(customer.employee_avatar_url) : defaultAvatar(name, customer.employee_id)} />
                        <ListItemText
                          primary={name}
                          secondary={customer.employee_phone}
                          slotProps={{
                            primary: { noWrap: true, sx: { typography: 'body2', fontWeight: 600 } },
                            secondary: { noWrap: true, sx: { color: 'text.disabled' } },
                          }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>{customer.branch_names.join(', ') || '—'}</TableCell>
                    <TableCell>{month.format('MMMM YYYY')}</TableCell>
                    <TableCell align="center">{customer.order_count}</TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{fCurrency(Number(customer.total_amount), { currency: 'UZS' })}</Typography></TableCell>
                    <TableCell>
                      <InvoiceCustomerStatusMenu
                        status={customer.status}
                        loading={updateStatus.isPending}
                        onChange={(status) => handleStatus(customer, status)}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        onClick={() => router.push(
                          `${paths.dashboard.invoice.details(customer.employee_id)}?month=${monthParam}`
                        )}
                      >
                        <Iconify icon="eva:arrow-ios-forward-fill" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!customersQuery.isLoading && !filtered.length && <TableNoData notFound />}
            </TableBody>
          </Table>
        </Scrollbar>

        <TablePaginationCustom
          page={table.page}
          dense={table.dense}
          count={filtered.length}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          onChangeDense={table.onChangeDense}
          onRowsPerPageChange={table.onChangeRowsPerPage}
        />
      </Card>
    </DashboardContent>
  );
}
