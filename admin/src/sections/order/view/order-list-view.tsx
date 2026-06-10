'use client';

import type { IOrderTableFilters } from 'src/types/order';

import { useBoolean, useSetState } from 'minimal-shared/hooks';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';

import { fDateTime } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import axios, { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  TableNoData,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

import { useAuthContext } from 'src/auth/hooks';

import { Iconify } from 'src/components/iconify';

import { PlaceOrderDialog } from '../place-order-dialog';
import { OrderTableToolbar } from '../order-table-toolbar';
import { OrderTableFiltersResult } from '../order-table-filters-result';

// ----------------------------------------------------------------------

type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
};

type Order = {
  id: string;
  user_id: string;
  user_name: string | null;
  user_phone: string | null;
  branch_id: string;
  kitchen_id: string;
  status: string;
  total_price: number;
  note: string | null;
  created_at: string;
  items: OrderItem[];
};

type PaginatedResponse = {
  items: Order[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
};

type SelectOption = { id: string; name: string };

const TABLE_HEAD = [
  { id: 'user', label: 'Foydalanuvchi', width: 160 },
  { id: 'items', label: 'Taomlar' },
  { id: 'total_price', label: 'Summa', width: 120 },
  { id: 'status', label: 'Status', width: 120 },
  { id: 'created_at', label: 'Sana', width: 160 },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Barchasi' },
  { value: 'pending', label: 'Kutilmoqda' },
  { value: 'grouped', label: 'Guruhlangan' },
  { value: 'cooking', label: 'Tayyorlanmoqda' },
  { value: 'ready', label: 'Tayyor' },
  { value: 'delivered', label: 'Yetkazildi' },
  { value: 'cancelled', label: 'Bekor' },
];

const statusColor = (s: string) => {
  if (s === 'delivered') return 'success';
  if (s === 'cancelled') return 'error';
  if (s === 'cooking') return 'warning';
  if (s === 'ready') return 'info';
  if (s === 'grouped') return 'secondary';
  return 'default';
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Kutilmoqda',
  grouped: 'Guruhlangan',
  cooking: 'Tayyorlanmoqda',
  ready: 'Tayyor',
  delivered: 'Yetkazildi',
  cancelled: 'Bekor',
};

// ----------------------------------------------------------------------

export function OrderListView() {
  const { user: authUser } = useAuthContext();
  const isSuperAdmin = authUser?.role === 'super_admin';
  const isEmployee   = authUser?.role === 'employee';

  const placeOrderDialog = useBoolean();

  const table = useTable({ defaultOrderBy: 'created_at' });

  const filters = useSetState<IOrderTableFilters>({
    name: '',
    status: 'all',
    company_id: '',
    branch_id: '',
    startDate: null,
    endDate: null,
  });

  const [data, setData] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tabStatus, setTabStatus] = useState('all');

  const [companies, setCompanies] = useState<SelectOption[]>([]);
  const [branches, setBranches] = useState<SelectOption[]>([]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    axios.get(endpoints.superAdmin.companies).then((r) => setCompanies(r.data)).catch(() => {});
  }, [isSuperAdmin]);

  useEffect(() => {
    const url = isSuperAdmin
      ? endpoints.superAdmin.branches
      : endpoints.superAdmin.branches;
    const params = isSuperAdmin && filters.state.company_id
      ? { company_id: filters.state.company_id }
      : undefined;
    axios.get(url, { params }).then((r) => {
      const raw = r.data;
      const list = Array.isArray(raw) ? raw : raw?.items ?? [];
      setBranches(list);
    }).catch(() => {});
  }, [isSuperAdmin, filters.state.company_id]);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {
        page: table.page + 1,
        page_size: table.rowsPerPage,
        sort: '-created_at',
      };
      if (tabStatus !== 'all') params.status = tabStatus;
      if (filters.state.company_id) params.company_id = filters.state.company_id;
      if (filters.state.branch_id) params.branch_id = filters.state.branch_id;
      if (filters.state.name) params.search = filters.state.name;

      const res = await axios.get<PaginatedResponse>(endpoints.orders.create, { params });
      setData(res.data.items);
      setTotal(res.data.total);
    } catch {
      toast.error('Buyurtmalarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  }, [table.page, table.rowsPerPage, tabStatus, filters.state.company_id, filters.state.branch_id, filters.state.name]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const canReset =
    !!filters.state.name ||
    !!filters.state.company_id ||
    !!filters.state.branch_id;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Buyurtmalar"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Buyurtmalar' },
        ]}
        action={
          isEmployee && (
            <Button
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={placeOrderDialog.onTrue}
            >
              Buyurtma berish
            </Button>
          )
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <PlaceOrderDialog
        open={placeOrderDialog.value}
        onClose={placeOrderDialog.onFalse}
        onSuccess={fetchOrders}
      />

      <Card>
        <Tabs
          value={tabStatus}
          onChange={(_, val) => { setTabStatus(val); table.onResetPage(); }}
          sx={{ px: 2.5, borderBottom: 1, borderColor: 'divider' }}
        >
          {STATUS_OPTIONS.map((tab) => (
            <Tab key={tab.value} value={tab.value} label={tab.label} />
          ))}
        </Tabs>

        <OrderTableToolbar
          filters={filters}
          onResetPage={table.onResetPage}
          isSuperAdmin={isSuperAdmin}
          options={{ companies, branches }}
        />

        {canReset && (
          <OrderTableFiltersResult
            filters={filters}
            onResetPage={table.onResetPage}
            totalResults={total}
            options={{ companies, branches }}
            sx={{ p: 2.5, pt: 0 }}
          />
        )}

        <Scrollbar sx={{ minHeight: 444 }}>
          <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 800 }}>
            <TableHeadCustom
              order={table.order}
              orderBy={table.orderBy}
              headCells={TABLE_HEAD}
              rowCount={data.length}
              numSelected={table.selected.length}
              onSort={table.onSort}
            />

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {row.user_name ?? '—'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {row.user_phone ?? row.user_id.slice(0, 8)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.25}>
                        {row.items?.map((item) => (
                          <Box key={item.id} sx={{ display: 'flex', gap: 0.5 }}>
                            <Typography variant="body2">{item.name}</Typography>
                            <Typography variant="caption" color="text.secondary">×{item.quantity}</Typography>
                          </Box>
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {fCurrency(row.total_price)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={STATUS_LABEL[row.status] ?? row.status}
                        color={statusColor(row.status) as any}
                        size="small"
                        variant="soft"
                      />
                    </TableCell>
                    <TableCell>{fDateTime(row.created_at)}</TableCell>
                  </TableRow>
                ))
              )}

              {!loading && data.length === 0 && (
                <TableNoData notFound />
              )}
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
