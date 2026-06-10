'use client';

import type { OrderStatus } from 'src/lib/api/orders';

import dayjs from 'dayjs';
import { useState, useCallback } from 'react';

import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

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

import { useBulkConfirm, useCompanyOrders } from '../hooks/use-orders';

// ----------------------------------------------------------------------

const STATUS_TABS: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all',        label: 'Barchasi'       },
  { value: 'created',    label: 'Yangi'          },
  { value: 'preparing',  label: 'Tayyorlanmoqda' },
  { value: 'on_the_way', label: "Yo'lda"         },
  { value: 'delivered',  label: 'Yetkazildi'     },
  { value: 'cancelled',  label: 'Bekor'          },
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

  const today = dayjs().format('YYYY-MM-DD');

  const queryParams = {
    target_date:  today,
    order_status: tabStatus === 'all' ? undefined : tabStatus,
    limit:        table.rowsPerPage,
    offset:       table.page * table.rowsPerPage,
  };

  const { data, isLoading, isError, error } = useCompanyOrders(queryParams);
  const bulkConfirm = useBulkConfirm();

  const orders    = data?.items ?? [];
  const total     = data?.total ?? 0;

  // on_the_way buyurtmalar soni — faqat barcha statuslar ko'rsatilganda
  const onTheWayCount = tabStatus === 'all' || tabStatus === 'on_the_way'
    ? orders.filter((o) => o.status === 'on_the_way').length
    : 0;

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

      <Card>
        <Tabs
          value={tabStatus}
          onChange={(_, val) => { setTabStatus(val); table.onResetPage(); }}
          sx={{ px: 2.5, borderBottom: 1, borderColor: 'divider' }}
        >
          {STATUS_TABS.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={tab.label}
              iconPosition="end"
              icon={
                <Label
                  variant={tabStatus === tab.value ? 'filled' : 'soft'}
                  color={STATUS_COLOR[tab.value] ?? 'default'}
                  sx={{ ml: 0.5 }}
                >
                  {tabStatus === tab.value ? total : ''}
                </Label>
              }
            />
          ))}
        </Tabs>

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
