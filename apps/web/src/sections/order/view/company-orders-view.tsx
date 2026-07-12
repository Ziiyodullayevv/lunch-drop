'use client';

import type { OrderStatus } from 'src/lib/api/orders';

import dayjs from 'dayjs';
import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { useTranslate } from 'src/locales';
import { orderItemsLabel } from 'src/lib/api/orders';
import { DashboardContent } from 'src/layouts/dashboard';
import { emptyOrderAnalytics } from 'src/lib/order-analytics';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  TableNoData,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

import { OrderAnalytics } from './order-analytics';
import { OrderStatusTabs } from './order-status-tabs';
import { buildCompanyOrdersParams } from './company-orders-data';
import { useOrderReport, useCompanyOrders, useBulkConfirmBranch } from '../hooks/use-orders';

// ----------------------------------------------------------------------

const STATUS_TABS = [
  { value: 'all',        label: 'Barchasi',       color: 'default' as const },
  { value: 'created',    label: 'Yangi',          color: 'default' as const },
  { value: 'preparing',  label: 'Tayyorlanmoqda', color: 'warning' as const },
  { value: 'on_the_way', label: "Yo'lda",         color: 'info' as const },
  { value: 'delivered',  label: 'Yetkazildi',     color: 'success' as const },
  { value: 'cancelled',  label: 'Bekor',          color: 'error' as const },
];

const STATUS_COLOR: Record<string, 'default' | 'warning' | 'info' | 'success' | 'error'> = {
  created:    'default',
  preparing:  'warning',
  on_the_way: 'info',
  delivered:  'success',
  cancelled:  'error',
};

const TABLE_HEAD = [
  { id: 'employee', label: 'employee' },
  { id: 'meal', label: 'meal', width: 160 },
  { id: 'date', label: 'date', width: 130 },
  { id: 'price', label: 'price', width: 120 },
  { id: 'status', label: 'status', width: 140 },
];

// ----------------------------------------------------------------------

export function CompanyOrdersView() {
  const { t } = useTranslate('common');
  const table = useTable({ defaultRowsPerPage: 10 });
  const [tabStatus, setTabStatus] = useState<OrderStatus | 'all'>('all');
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(null);
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(dayjs());
  const dateError = Boolean(startDate && endDate && startDate.isAfter(endDate, 'day'));

  const queryParams = buildCompanyOrdersParams({
    startDate: startDate?.isValid() ? startDate.format('YYYY-MM-DD') : '',
    endDate: endDate?.isValid() ? endDate.format('YYYY-MM-DD') : '',
    status: tabStatus,
    limit: table.rowsPerPage,
    offset: table.page * table.rowsPerPage,
  });

  const { data, isLoading, isError, error } = useCompanyOrders(queryParams);
  const reportStart = (startDate ?? dayjs().startOf('month')).format('YYYY-MM-DD');
  const reportEnd = (endDate ?? dayjs()).format('YYYY-MM-DD');
  const { data: report } = useOrderReport(reportStart, reportEnd, !dateError);
  const bulkBranch = useBulkConfirmBranch();
  const orders    = data?.items ?? [];
  const total     = data?.total ?? 0;
  const statusCounts = data?.status_counts ?? {
    all: tabStatus === 'all' ? total : 0,
    created: tabStatus === 'created' ? total : 0,
    preparing: tabStatus === 'preparing' ? total : 0,
    on_the_way: tabStatus === 'on_the_way' ? total : 0,
    delivered: tabStatus === 'delivered' ? total : 0,
    cancelled: tabStatus === 'cancelled' ? total : 0,
  };
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={t('order.title')}
        links={[
          { name: t('navigation.dashboard'), href: paths.dashboard.root },
          { name: t('order.title') },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error instanceof Error ? error.message : t('order.loadError')}
        </Alert>
      )}

      <OrderAnalytics data={data?.analytics ?? emptyOrderAnalytics()} />

      {!!report?.branches.length && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
          {report.branches.map((branch) => (
            <Card key={branch.branch_id} sx={{ p: 2.5 }}>
              <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="subtitle1">{branch.branch_name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {branch.order_count} ta buyurtma · {fCurrency(Number(branch.total_amount))}
                  </Typography>
                  <Typography variant="caption" color={branch.pending_count ? 'warning.main' : 'success.main'}>
                    {branch.pending_count ? `${branch.pending_count} ta tasdiqlanmagan` : 'Barchasi tasdiqlangan'}
                  </Typography>
                </Box>
                {!!branch.pending_count && (
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => bulkBranch.mutate({ branchId: branch.branch_id, targetDate: endDate?.format('YYYY-MM-DD') })}
                    disabled={bulkBranch.isPending}
                  >
                    Tasdiqlash
                  </Button>
                )}
              </Stack>
            </Card>
          ))}
        </Box>
      )}

      {!!report?.employees.length && (
        <Card sx={{ mb: 3, p: 2.5 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Xodimlar bo‘yicha hisob-kitob</Typography>
          <Stack spacing={1}>
            {report.employees.map((employee) => (
              <Stack key={`${employee.employee_id}-${employee.branch_id}`} direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{employee.employee_name ?? 'Noma’lum xodim'}</Typography>
                  <Typography variant="caption" color="text.secondary">{employee.branch_name}</Typography>
                </Box>
                <Typography variant="body2">{employee.order_count} ta · {fCurrency(Number(employee.total_amount))}</Typography>
              </Stack>
            ))}
          </Stack>
        </Card>
      )}

      <Card>
        <OrderStatusTabs
          value={tabStatus}
          tabs={STATUS_TABS.map((tab) => ({
            ...tab,
            label: t(tab.value === 'all' ? 'order.status.all' : `orderExtra.kitchenStatus.${tab.value === 'on_the_way' ? 'onTheWay' : tab.value}`),
          }))}
          counts={statusCounts}
          onChange={(value) => {
            setTabStatus(value as OrderStatus | 'all');
            table.onResetPage();
          }}
        />

        <Box
          sx={{
            p: 2.5,
            gap: 1.5,
            display: 'flex',
            alignItems: 'center',
            flexDirection: { xs: 'column', sm: 'row' },
          }}
        >
          <DatePicker
            label={t('orderExtra.startDate')}
            value={startDate}
            maxDate={endDate ?? dayjs()}
            onChange={(value) => {
              setStartDate(value);
              table.onResetPage();
            }}
            slotProps={{ textField: { fullWidth: true } }}
            sx={{ width: { xs: 1, sm: 240 } }}
          />

          <DatePicker
            label={t('orderExtra.endDate')}
            value={endDate}
            minDate={startDate ?? undefined}
            maxDate={dayjs()}
            onChange={(value) => {
              setEndDate(value);
              table.onResetPage();
            }}
            slotProps={{
              textField: {
                fullWidth: true,
                error: dateError,
                helperText: dateError
                  ? "Tugash sanasi boshlanish sanasidan oldin bo'lishi mumkin emas"
                  : undefined,
              },
            }}
            sx={{ width: { xs: 1, sm: 240 } }}
          />

          {(startDate || !endDate || !endDate.isSame(dayjs(), 'day')) && (
            <Button
              color="inherit"
              startIcon={<Iconify icon="solar:restart-bold" />}
              onClick={() => {
                setStartDate(null);
                setEndDate(dayjs());
                table.onResetPage();
              }}
            >
              Tozalash
            </Button>
          )}
        </Box>

        <Scrollbar sx={{ minHeight: 444 }}>
          <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 700 }}>
            <TableHeadCustom
              order={table.order}
              orderBy={table.orderBy}
              headCells={TABLE_HEAD.map((cell) => ({ ...cell, label: t(`orderCompany.table.${cell.label}`) }))}
              rowCount={orders.length}
              numSelected={table.selected.length}
              onSort={table.onSort}
              onSelectAllRows={(checked) => table.onSelectAllRows(checked, orders.map((row) => row.id))}
            />

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((row) => (
                  <TableRow key={row.id} hover selected={table.selected.includes(row.id)}>
                    <TableCell padding="checkbox">
                      <Checkbox checked={table.selected.includes(row.id)} onChange={() => table.onSelectRow(row.id)} />
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.25}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {row.employee_name ?? '—'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {row.branch_name ?? row.company_name ?? ''}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">{orderItemsLabel(row)}</Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">{fDate(row.target_date)}</Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {fCurrency(parseFloat(row.historical_price))}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={t(`orderExtra.kitchenStatus.${row.status === 'on_the_way' ? 'onTheWay' : row.status}`, { defaultValue: row.status })}
                        color={STATUS_COLOR[row.status] ?? 'default'}
                        size="small"
                        variant="soft"
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}

              {!isLoading && orders.length === 0 && <TableNoData notFound />}
            </TableBody>
          </Table>
        </Scrollbar>

        <TablePaginationCustom
          page={table.page}
          dense={table.dense}
          count={total}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          onChangeDense={table.onChangeDense}
          onRowsPerPageChange={table.onChangeRowsPerPage}
        />
      </Card>
    </DashboardContent>
  );
}
