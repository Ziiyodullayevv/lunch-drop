'use client';

import type { SelectChangeEvent } from '@mui/material/Select';
import type { OrderStatus } from 'src/lib/api/orders';

import dayjs from 'dayjs';
import { useMemo, useState, useCallback } from 'react';
import { useBoolean, usePopover, useDebounce } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Select from '@mui/material/Select';
import Avatar from '@mui/material/Avatar';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Collapse from '@mui/material/Collapse';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import FormControl from '@mui/material/FormControl';
import InputAdornment from '@mui/material/InputAdornment';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fDateTime } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { DashboardContent } from 'src/layouts/dashboard';
import { calculateOrderAnalytics } from 'src/lib/order-analytics';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomPopover } from 'src/components/custom-popover';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  TableNoData,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

import { useAuthContext } from 'src/auth/hooks';

import { YandexDelivery } from './yandex-delivery';
import { OrderAnalytics } from './order-analytics';
import { OrderStatusTabs } from './order-status-tabs';
import { filterOrdersForView } from './order-filters-data';
import { useKitchenMe, useKitchenOrders, useUpdateOrderStatus } from '../hooks/use-orders';

// ----------------------------------------------------------------------

const fSom = (v: number) => fCurrency(v, { currency: 'UZS' });

// ----------------------------------------------------------------------

type OrderItem = { id: string; name: string; quantity: number; price: number };

type Order = {
  id: string;
  user_id: string;
  user_name: string | null;
  user_phone: string | null;
  total_price: number;
  note: string | null;
  status: string;
  items: OrderItem[];
};

type GroupedOrder = {
  id: string;
  status: string;
  total_orders: number;
  total_items: number;
  total_amount: number;
  delivery_time: string;
  created_at: string;
  branch: { id: string; name: string; company_id: string; company_name: string | null };
  kitchen: { id: string; name: string };
  orders?: Order[];
};

// ----------------------------------------------------------------------

type StatusConfig = {
  label: string;
  color: 'default' | 'warning' | 'info' | 'success' | 'error';
};

const STATUS_MAP: Record<string, StatusConfig> = {
  created:    { label: 'Yangi',           color: 'warning' },
  preparing:  { label: 'Tayyorlanmoqda',  color: 'warning' },
  on_the_way: { label: "Yo'lda",          color: 'info'    },
  delivered:  { label: 'Yetkazildi',      color: 'success' },
  cancelled:  { label: 'Bekor qilindi',   color: 'error'   },
};

const getStatus = (s: string): StatusConfig =>
  STATUS_MAP[s] ?? { label: s, color: 'default' };

const isActive   = (s: string) => s === 'created' || s === 'preparing';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'company',   label: 'Kompaniya',    width: 200 },
  { id: 'employee',  label: 'Buyurtmachi',  width: 180 },
  { id: 'meal',      label: 'Taom',         width: 120 },
  { id: 'status',    label: 'Holat',        width: 150 },
  { id: 'delivery',  label: 'Yetkazish',    width: 130 },
  { id: 'amount',    label: 'Summa',        width: 150 },
  { id: 'actions',   label: '',             width: 56  },
];

const STATUS_TABS = [
  { value: 'all',        label: 'Barchasi',   color: 'default' as const },
  { value: 'active',     label: 'Aktiv',      color: 'warning' as const },
  { value: 'on_the_way', label: "Yo'lda",     color: 'info' as const },
  { value: 'delivered',  label: 'Yetkazildi', color: 'success' as const },
  { value: 'cancelled',  label: 'Bekor',      color: 'error' as const },
];

// ----------------------------------------------------------------------

// ----------------------------------------------------------------------

function DrawerOrderRow({ order }: { order: Order }) {
  const open = useBoolean();

  return (
    <Box
      sx={(theme) => ({
        border: `1px solid ${theme.vars.palette.divider}`,
        borderRadius: 1.5,
        overflow: 'hidden',
      })}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2,
          py: 1.5,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' },
        }}
        onClick={open.onToggle}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
            {order.user_name ?? '—'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {order.user_phone ?? ''}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            {order.items.length} ta taom
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 72, textAlign: 'right' }}>
            {fSom(order.total_price)}
          </Typography>
          <Iconify
            icon="eva:arrow-ios-downward-fill"
            width={16}
            sx={{
              transition: 'transform 0.2s',
              transform: open.value ? 'rotate(180deg)' : 'rotate(0)',
              color: 'text.secondary',
            }}
          />
        </Stack>
      </Box>

      <Collapse in={open.value} timeout="auto" unmountOnExit>
        <Divider />
        <Box sx={{ bgcolor: 'background.neutral', px: 2, py: 1 }}>
          {order.items.map((item) => (
            <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', py: 0.75, gap: 1 }}>
              <Avatar
                variant="rounded"
                sx={{ width: 28, height: 28, bgcolor: 'primary.lighter', color: 'primary.dark' }}
              >
                <Iconify icon="solar:tea-cup-bold" width={14} />
              </Avatar>
              <Typography variant="body2" sx={{ flex: 1 }}>
                {item.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mx: 1 }}>
                ×{item.quantity}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 80, textAlign: 'right' }}>
                {fSom(item.price * item.quantity)}
              </Typography>
            </Box>
          ))}
          {order.note && (
            <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary">
                💬 {order.note}
              </Typography>
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}

// ----------------------------------------------------------------------

function OrderDetailDrawer({
  row,
  onClose,
  onStatusChange,
}: {
  row: GroupedOrder | null;
  onClose: () => void;
  onStatusChange: () => void;
}) {
  const [busyStatus, setBusyStatus] = useState<string | null>(null);
  const updateOrderStatusMutation = useUpdateOrderStatus();

  const updateStatus = async (status: string) => {
    if (!row) return;
    setBusyStatus(status);
    try {
      await updateOrderStatusMutation.mutateAsync({
        id: row.id,
        status: status as OrderStatus,
      });
      toast.success(getStatus(status).label);
      onStatusChange();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setBusyStatus(null);
    }
  };

  const cfg = row ? getStatus(row.status) : null;

  return (
    <Drawer
      anchor="right"
      open={!!row}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 420 } } } }}
    >
      <Box
        sx={{
          px: 3,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ lineHeight: 1.3 }}>
            {row?.branch.company_name ?? '—'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row?.branch.name && row.branch.name !== '—' ? row.branch.name : ''}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {cfg && (
            <Label variant="soft" color={cfg.color} sx={{ px: 1.5 }}>
              {cfg.label}
            </Label>
          )}
          <IconButton onClick={onClose} size="small">
            <Iconify icon="solar:close-circle-bold" />
          </IconButton>
        </Stack>
      </Box>

      <Scrollbar sx={{ flex: 1 }}>
        {row ? (
          <Box sx={{ px: 3, py: 2.5 }}>
            <Stack
              direction="row"
              spacing={2}
              sx={{ mb: 3, p: 2, bgcolor: 'background.neutral', borderRadius: 1.5 }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">Buyurtmachi</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {row.orders?.[0]?.user_name ?? '—'}
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">Summa</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{fSom(row.total_amount)}</Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">Yetkazish</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{fDateTime(row.delivery_time, 'HH:mm')}</Typography>
              </Box>
            </Stack>

            {(isActive(row.status) || row.status === 'on_the_way') && (
              <Stack spacing={1} sx={{ mb: 3 }}>
                {isActive(row.status) && (
                  <LoadingButton
                    fullWidth
                    variant="contained"
                    color="info"
                    size="large"
                    loading={busyStatus === 'on_the_way'}
                    startIcon={<Iconify icon="mdi:motorbike" />}
                    onClick={() => updateStatus('on_the_way')}
                  >
                    Yo&apos;lga chiqdi
                  </LoadingButton>
                )}
                {row.status === 'on_the_way' && (
                  <LoadingButton
                    fullWidth
                    variant="contained"
                    color="success"
                    size="large"
                    loading={busyStatus === 'delivered'}
                    startIcon={<Iconify icon="solar:check-circle-bold" />}
                    onClick={() => updateStatus('delivered')}
                  >
                    Yetkazildi
                  </LoadingButton>
                )}
              </Stack>
            )}

            <Stack spacing={1}>
              {row.orders?.map((order) => (
                <DrawerOrderRow key={order.id} order={order} />
              ))}
            </Stack>

            <Box
              sx={{
                mt: 3,
                pt: 2,
                borderTop: '2px solid',
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">Jami</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{fSom(row.total_amount)}</Typography>
            </Box>
          </Box>
        ) : null}
      </Scrollbar>
    </Drawer>
  );
}

// ----------------------------------------------------------------------

function GroupedOrderRow({
  row,
  busy,
  onSelect,
  onMenuOpen,
}: {
  row: GroupedOrder;
  busy: boolean;
  onSelect: () => void;
  onMenuOpen: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const cfg = getStatus(row.status);

  const employeeName = row.orders?.[0]?.user_name ?? '—';

  return (
    <TableRow hover sx={{ cursor: 'pointer' }} onClick={onSelect}>
      {/* Kompaniya + Filial */}
      <TableCell>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {row.branch.company_name ?? '—'}
        </Typography>
        <Typography variant="caption" color="text.disabled">
          {row.branch.name !== '—' ? row.branch.name : ''}
        </Typography>
      </TableCell>

      {/* Buyurtmachi (employee) */}
      <TableCell>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {employeeName}
        </Typography>
      </TableCell>

      {/* Taom soni */}
      <TableCell>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {row.total_orders} ta
        </Typography>
      </TableCell>

      <TableCell>
        <Label variant="soft" color={cfg.color}>
          {cfg.label}
        </Label>
      </TableCell>

      <TableCell>
        <Typography variant="body2">{fDateTime(row.delivery_time, 'HH:mm')}</Typography>
        <Typography variant="caption" color="text.disabled">{fDateTime(row.created_at, 'HH:mm')}</Typography>
      </TableCell>

      <TableCell>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {fSom(row.total_amount)}
        </Typography>
      </TableCell>

      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
        <IconButton size="small" onClick={onMenuOpen} disabled={busy}>
          {busy
            ? <CircularProgress size={18} />
            : <Iconify icon="eva:more-vertical-fill" />
          }
        </IconButton>
      </TableCell>
    </TableRow>
  );
}

// ----------------------------------------------------------------------

export function KitchenOrdersView() {
  useAuthContext();
  const router = useRouter();

  const table = useTable({ defaultRowsPerPage: 10 });

  const [tabStatus, setTabStatus] = useState('all');
  const [selectedRow, setSelectedRow] = useState<GroupedOrder | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [activeRow, setActiveRow] = useState<GroupedOrder | null>(null);
  const rowMenu = usePopover();

  const [searchText, setSearchText] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(null);
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(dayjs());
  const debouncedSearch = useDebounce(searchText, 300);

  const { data: kitchenOrders, isLoading: loading } = useKitchenOrders();
  const { data: kitchenMe } = useKitchenMe();
  const updateOrderStatus = useUpdateOrderStatus();

  const kitchenName = kitchenMe?.name ?? '—';

  const companies = useMemo(() => {
    const seen = new Set<string>();
    const list: { id: string; name: string }[] = [];
    (kitchenOrders ?? []).forEach((order) => {
      if (order.company_id && !seen.has(order.company_id)) {
        seen.add(order.company_id);
        list.push({
          id: order.company_id,
          name: order.company_name ?? order.company_id,
        });
      }
    });
    return list;
  }, [kitchenOrders]);

  const branches = useMemo(() => {
    const seen = new Set<string>();
    const list: { id: string; name: string }[] = [];
    (kitchenOrders ?? []).forEach((order) => {
      if (
        order.branch_id &&
        !seen.has(order.branch_id) &&
        (!companyFilter || order.company_id === companyFilter)
      ) {
        seen.add(order.branch_id);
        list.push({
          id: order.branch_id,
          name: order.branch_name ?? order.branch_id,
        });
      }
    });
    return list;
  }, [kitchenOrders, companyFilter]);

  const filteredOrders = useMemo(
    () =>
      filterOrdersForView(kitchenOrders ?? [], {
        startDate: startDate?.isValid() ? startDate.format('YYYY-MM-DD') : undefined,
        endDate: endDate?.isValid() ? endDate.format('YYYY-MM-DD') : undefined,
        companyId: companyFilter || undefined,
        branchId: branchFilter || undefined,
        search: debouncedSearch || undefined,
      }),
    [
      kitchenOrders,
      startDate,
      endDate,
      companyFilter,
      branchFilter,
      debouncedSearch,
    ]
  );

  const groupedOrders: GroupedOrder[] = filteredOrders.map((o) => ({
    id: o.id,
    status: o.status,
    total_orders: 1,
    total_items: 1,
    total_amount: parseFloat(o.historical_price),
    delivery_time: o.target_date,
    created_at: o.created_at,
    branch: {
      id: o.branch_id ?? o.kitchen_id,
      name: o.branch_name ?? '—',
      company_id: o.company_id ?? '',
      company_name: o.company_name,
    },
    kitchen: { id: o.kitchen_id, name: kitchenName },
    orders: [{
      id: o.id,
      user_id: o.employee_id,
      user_name: o.employee_name,
      user_phone: null,
      total_price: parseFloat(o.historical_price),
      note: null,
      status: o.status,
      items: o.meal_name
        ? [{ id: o.meal_id, name: o.meal_name, quantity: 1, price: parseFloat(o.historical_price) }]
        : [],
    }],
  }));

  const analytics = useMemo(
    () =>
      calculateOrderAnalytics(
        filteredOrders.map((order) => ({
          status: order.status,
          amount: order.historical_price,
        }))
      ),
    [filteredOrders]
  );

  const tabCount = (val: string) => {
    if (val === 'all')    return groupedOrders.length;
    if (val === 'active') return groupedOrders.filter((g) => isActive(g.status)).length;
    return groupedOrders.filter((g) => g.status === val).length;
  };

  const filtered = useMemo(() => {
    let result = groupedOrders;
    if (tabStatus === 'active') result = result.filter((g) => isActive(g.status));
    else if (tabStatus !== 'all') result = result.filter((g) => g.status === tabStatus);
    return result;
  }, [groupedOrders, tabStatus]);

  const paged = filtered.slice(
    table.page * table.rowsPerPage,
    table.page * table.rowsPerPage + table.rowsPerPage
  );

  const handleUpdate = useCallback(async (id: string, status: string) => {
    setBusyId(id);
    try {
      await updateOrderStatus.mutateAsync({
        id,
        status: status as OrderStatus,
      });
      toast.success(getStatus(status).label);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setBusyId(null);
    }
  }, [updateOrderStatus]);

  const handleMenuOpen = useCallback((row: GroupedOrder, e: React.MouseEvent<HTMLButtonElement>) => {
    setActiveRow(row);
    rowMenu.onOpen(e);
  }, [rowMenu]);

  const handleMenuClose = useCallback(() => {
    rowMenu.onClose();
    setActiveRow(null);
  }, [rowMenu]);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Buyurtmalar"
        links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Buyurtmalar' }]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <OrderAnalytics data={analytics} />

      <YandexDelivery orders={kitchenOrders ?? []} kitchen={kitchenMe} />

      <Card>
        <OrderStatusTabs
          value={tabStatus}
          tabs={STATUS_TABS}
          counts={Object.fromEntries(
            STATUS_TABS.map((tab) => [tab.value, tabCount(tab.value)])
          )}
          onChange={(value) => {
            setTabStatus(value);
            table.onResetPage();
          }}
        />

        {/* Filters toolbar */}
        <Box
          sx={{
            p: 2.5,
            gap: 2,
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(4, minmax(0, 1fr))',
            },
            alignItems: 'center',
          }}
        >
          <FormControl fullWidth>
            <InputLabel>Kompaniya</InputLabel>
            <Select
              label="Kompaniya"
              value={companyFilter}
              onChange={(e: SelectChangeEvent<string>) => {
                setCompanyFilter(e.target.value);
                setBranchFilter('');
                table.onResetPage();
              }}
            >
              <MenuItem value="">Barchasi</MenuItem>
              {companies.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Filial</InputLabel>
            <Select
              label="Filial"
              value={branchFilter}
              onChange={(e: SelectChangeEvent<string>) => {
                setBranchFilter(e.target.value);
                table.onResetPage();
              }}
            >
              <MenuItem value="">Barchasi</MenuItem>
              {branches.map((b) => (
                <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <DatePicker
            label="Boshlanish sanasi"
            value={startDate}
            maxDate={endDate ?? dayjs()}
            onChange={(value) => {
              setStartDate(value);
              table.onResetPage();
            }}
            slotProps={{ textField: { fullWidth: true } }}
            sx={{ width: 1 }}
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
            slotProps={{ textField: { fullWidth: true } }}
            sx={{ width: 1 }}
          />

          <TextField
            value={searchText}
            onChange={(e) => { setSearchText(e.target.value); table.onResetPage(); }}
            placeholder="Kompaniya, filial, xodim yoki taom bo'yicha..."
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
                endAdornment: searchText ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchText('')}>
                      <Iconify icon="solar:close-circle-bold" width={16} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
            sx={{ gridColumn: '1 / -1' }}
          />

          {(companyFilter ||
            branchFilter ||
            searchText ||
            startDate ||
            !endDate ||
            !endDate.isSame(dayjs(), 'day')) && (
            <LoadingButton
              color="inherit"
              startIcon={<Iconify icon="solar:restart-bold" />}
              onClick={() => {
                setCompanyFilter('');
                setBranchFilter('');
                setSearchText('');
                setStartDate(null);
                setEndDate(dayjs());
                table.onResetPage();
              }}
            >
              Tozalash
            </LoadingButton>
          )}
        </Box>

        <Scrollbar sx={{ minHeight: 444 }}>
          <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 900 }}>
            <TableHeadCustom
              order={table.order}
              orderBy={table.orderBy}
              headCells={TABLE_HEAD}
              rowCount={filtered.length}
              numSelected={table.selected.length}
              onSort={table.onSort}
            />
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((row) => (
                  <GroupedOrderRow
                    key={row.id}
                    row={row}
                    busy={busyId === row.id}
                    onSelect={() => router.push(paths.dashboard.order.details(row.id))}
                    onMenuOpen={(e) => handleMenuOpen(row, e)}
                  />
                ))
              )}
              {!loading && filtered.length === 0 && <TableNoData notFound />}
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

      <CustomPopover
        open={rowMenu.open}
        anchorEl={rowMenu.anchorEl}
        onClose={handleMenuClose}
        slotProps={{ arrow: { placement: 'right-top' } }}
      >
        <MenuList sx={{ minWidth: 160 }}>
          <MenuItem
            onClick={() => {
              if (activeRow) router.push(paths.dashboard.order.details(activeRow.id));
              handleMenuClose();
            }}
          >
            <Iconify icon="solar:eye-bold" sx={{ mr: 1 }} />
            Ko&apos;rish
          </MenuItem>

          {activeRow && isActive(activeRow.status) && (
            <MenuItem onClick={() => { if (activeRow) handleUpdate(activeRow.id, 'on_the_way'); handleMenuClose(); }}>
              <Iconify icon="mdi:motorbike" sx={{ mr: 1 }} />
              Yo&apos;lga chiqdi
            </MenuItem>
          )}

          {activeRow?.status === 'on_the_way' && (
            <MenuItem onClick={() => { if (activeRow) handleUpdate(activeRow.id, 'delivered'); handleMenuClose(); }}>
              <Iconify icon="solar:check-circle-bold" sx={{ mr: 1 }} />
              Yetkazildi
            </MenuItem>
          )}

          {activeRow && !['delivered', 'cancelled'].includes(activeRow.status) && (
            <MenuItem
              sx={{ color: 'error.main' }}
              onClick={() => { if (activeRow) handleUpdate(activeRow.id, 'cancelled'); handleMenuClose(); }}
            >
              <Iconify icon="solar:close-circle-bold" sx={{ mr: 1 }} />
              Bekor qilish
            </MenuItem>
          )}
        </MenuList>
      </CustomPopover>

      <OrderDetailDrawer
        row={selectedRow}
        onClose={() => setSelectedRow(null)}
        onStatusChange={() => {}}
      />
    </DashboardContent>
  );
}
