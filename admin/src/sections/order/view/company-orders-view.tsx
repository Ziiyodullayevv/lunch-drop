'use client';

import type { OrderStatus } from 'src/lib/api/orders';

import dayjs from 'dayjs';
import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { DashboardContent } from 'src/layouts/dashboard';
import { emptyOrderAnalytics } from 'src/lib/order-analytics';

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

import { OrderAnalytics } from './order-analytics';
import { OrderStatusTabs } from './order-status-tabs';
import { buildCompanyOrdersParams } from './company-orders-data';
import { useBulkConfirm, useCompanyOrders } from '../hooks/use-orders';

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

const STATUS_LABEL: Record<string, string> = {
  created:    'Yangi',
  preparing:  'Tayyorlanmoqda',
  on_the_way: "Yo'lda",
  delivered:  'Yetkazildi',
  cancelled:  'Bekor',
};

const TABLE_HEAD = [
  { id: 'employee', label: 'Xodim'   },
  { id: 'meal',     label: 'Taom',    width: 160 },
  { id: 'date',     label: 'Sana',    width: 130 },
  { id: 'price',    label: 'Narx',    width: 120 },
  { id: 'status',   label: 'Holat',   width: 140 },
];

// ----------------------------------------------------------------------

export function CompanyOrdersView() {
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
  const bulkConfirm = useBulkConfirm();

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

  const onTheWayCount = statusCounts.on_the_way ?? 0;

  const handleBulkConfirm = useCallback(async () => {
    try {
      const result = await bulkConfirm.mutateAsync();
      toast.success(`${result.confirmed} ta buyurtma tasdiqlandi`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    }
  }, [bulkConfirm]);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Buyurtmalar"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Buyurtmalar' },
        ]}
        action={
          onTheWayCount > 0 && (
            <LoadingButton
              variant="contained"
              color="success"
              loading={bulkConfirm.isPending}
              startIcon={<Iconify icon="solar:check-circle-bold" />}
              onClick={handleBulkConfirm}
            >
              Barchasini tasdiqlash ({onTheWayCount})
            </LoadingButton>
          )
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error instanceof Error ? error.message : 'Buyurtmalarni yuklashda xatolik'}
        </Alert>
      )}

      <OrderAnalytics data={data?.analytics ?? emptyOrderAnalytics()} />

      <Card>
        <OrderStatusTabs
          value={tabStatus}
          tabs={STATUS_TABS}
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
            label="Boshlanish sanasi"
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
            label="Tugash sanasi"
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
              headCells={TABLE_HEAD}
              rowCount={orders.length}
              numSelected={table.selected.length}
              onSort={table.onSort}
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
                  <TableRow key={row.id} hover>
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
                      <Typography variant="body2">{row.meal_name ?? '—'}</Typography>
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
                        label={STATUS_LABEL[row.status] ?? row.status}
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
