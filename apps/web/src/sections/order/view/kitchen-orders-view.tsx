'use client';

import type { OrderStatus } from 'src/lib/api/orders';

import dayjs from 'dayjs';
import { useMemo, useState, useCallback } from 'react';
import { useBoolean, usePopover, useDebounce, usePopoverHover } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Avatar from '@mui/material/Avatar';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import SvgIcon from '@mui/material/SvgIcon';
import Checkbox from '@mui/material/Checkbox';
import Collapse from '@mui/material/Collapse';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import ListItemText from '@mui/material/ListItemText';
import InputAdornment from '@mui/material/InputAdornment';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';

import { fCurrency } from 'src/utils/format-number';
import { fDate, fDateTime } from 'src/utils/format-time';

import { useTranslate } from 'src/locales';
import { CONFIG } from 'src/global-config';
import { getImagePreviewUrl } from 'src/lib/image-url';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomPopover } from 'src/components/custom-popover';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { NavDropdown, NavDropdownPaper } from 'src/components/nav-basic/components';
import {
  useTable,
  TableNoData,
  TableHeadCustom,
  TableSelectedAction,
  TablePaginationCustom,
} from 'src/components/table';

import { useBranches } from 'src/sections/branch/hooks/use-branches';
import { useCompanies } from 'src/sections/company/hooks/use-companies';

import { useAuthContext } from 'src/auth/hooks';

import { OrderStatusTabs } from './order-status-tabs';
import { filterOrdersForView } from './order-filters-data';
import {
  useKitchenMe,
  useKitchenOrders,
  useCompanyOrders,
  useSuperAdminOrders,
  useUpdateOrderStatus,
  useUpdateSuperAdminOrderStatus,
} from '../hooks/use-orders';

// ----------------------------------------------------------------------

const fSom = (v: number) => fCurrency(v, { currency: 'UZS' });

const getDefaultAvatar = (fullName: string | null | undefined, id: string) => {
  const surname = fullName?.trim().split(/\s+/).at(-1)?.toLocaleLowerCase('uz') ?? '';
  const hashSource = surname || id;
  const hash = Array.from(hashSource).reduce(
    (total, char) => (total * 31 + char.charCodeAt(0)) % 2147483647,
    0
  );
  const isFemale = surname.endsWith('va');
  const index = (hash % 12) * 2 + (isFemale ? 1 : 2);

  return `${CONFIG.assetsDir}/assets/images/mock/avatar/avatar-${index}.webp`;
};

function NextStageIcon() {
  return (
    <SvgIcon viewBox="0 0 48 48">
      <path d="M0 0h48v48H0z" fill="none" />
      <path
        d="M4 40.836q7.34-8.96 13.036-10.168t10.846-.365V41L44 23.545L27.882 7v10.167Q18.359 17.242 11.69 24Q5.023 30.758 4 40.836Z"
        fill="currentColor"
        fillRule="evenodd"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="4"
        clipRule="evenodd"
      />
    </SvgIcon>
  );
}

function DeliveryIcon() {
  return (
    <SvgIcon viewBox="0 0 24 24">
      <path d="M0 0h24v24H0z" fill="none" />
      <path
        fill="currentColor"
        d="M1.75 13.325q-.425 0-.712-.287t-.288-.713t.288-.712t.712-.288h3.5q.425 0 .713.288t.287.712t-.288.713t-.712.287zm3.125 5.8Q4 18.25 4 17H2.75q-.5 0-.8-.375t-.175-.85l.225-.95h3.125q1.05 0 1.775-.725t.725-1.775q0-.325-.075-.6t-.2-.55h.95q1.05 0 1.775-.725t.725-1.775T8.3 6.175H4.5l.15-.6q.15-.7.688-1.137T6.6 4h10.15q.5 0 .8.375t.175.85L17.075 8H19q.475 0 .9.213t.7.587l1.875 2.475q.275.35.35.763t0 .837L22.15 16.2q-.075.35-.35.575t-.625.225H20q0 1.25-.875 2.125T17 20t-2.125-.875T14 17h-4q0 1.25-.875 2.125T7 20t-2.125-.875M3.75 9.675q-.425 0-.712-.288t-.288-.712t.288-.712t.712-.288h4.5q.425 0 .713.288t.287.712t-.288.713t-.712.287zM7 18q.425 0 .713-.288T8 17t-.288-.712T7 16t-.712.288T6 17t.288.713T7 18m10 0q.425 0 .713-.288T18 17t-.288-.712T17 16t-.712.288T16 17t.288.713T17 18m-1.075-5h4.825l.1-.525L19 10h-2.375z"
      />
    </SvgIcon>
  );
}

// ----------------------------------------------------------------------

type OrderItem = {
  id: string;
  name: string;
  imageUrl: string | null;
  quantity: number;
  price: number;
};

type Order = {
  id: string;
  user_id: string;
  user_name: string | null;
  user_phone: string | null;
  user_avatar_url: string | null;
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
  created:    { label: 'created', color: 'warning' },
  preparing:  { label: 'preparing', color: 'warning' },
  on_the_way: { label: 'onTheWay', color: 'info' },
  delivered:  { label: 'delivered', color: 'success' },
  cancelled:  { label: 'cancelled', color: 'error' },
  mixed:      { label: 'Aralash holat', color: 'default' },
};

const getStatus = (s: string): StatusConfig =>
  STATUS_MAP[s] ?? { label: s, color: 'default' };

const isActive   = (s: string) => s === 'created' || s === 'preparing';
const hasActiveOrders = (group: GroupedOrder) =>
  group.orders?.some((order) => isActive(order.status)) ?? false;
const canAdvanceOrders = (group: GroupedOrder) =>
  group.orders?.some((order) => ['created', 'preparing', 'on_the_way'].includes(order.status)) ?? false;

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'order', label: 'order', width: 130 },
  { id: 'customer', label: 'customer' },
  { id: 'date', label: 'date', width: 150 },
  { id: 'items', label: 'items', width: 110, align: 'center' as const },
  { id: 'price', label: 'price', width: 150 },
  { id: 'status', label: 'status', width: 150 },
  { id: 'actions', label: '', width: 96 },
];

const STATUS_TABS = [
  { value: 'all', label: 'all', color: 'default' as const },
  { value: 'active', label: 'active', color: 'warning' as const },
  { value: 'on_the_way', label: 'onTheWay', color: 'info' as const },
  { value: 'delivered', label: 'delivered', color: 'success' as const },
  { value: 'cancelled', label: 'cancelled', color: 'error' as const },
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
}: {
  row: GroupedOrder | null;
  onClose: () => void;
}) {
  const { t } = useTranslate('common');
  const [busyStatus, setBusyStatus] = useState<string | null>(null);
  const updateOrderStatusMutation = useUpdateOrderStatus();

  const updateStatus = async (status: string) => {
    if (!row) return;
    setBusyStatus(status);
    try {
      const targets = (row.orders ?? []).filter((order) => isActive(order.status));
      await Promise.all(
        targets.map((order) =>
          updateOrderStatusMutation.mutateAsync({
            id: order.id,
            status: status as OrderStatus,
          })
        )
      );
      const statusConfig = getStatus(status);
      toast.success(
        t(`orderExtra.kitchenStatus.${statusConfig.label}`, { defaultValue: statusConfig.label })
      );
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
              {t(`orderExtra.kitchenStatus.${cfg.label}`, { defaultValue: cfg.label })}
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
                <Typography variant="caption" color="text.secondary">{t('orderExtra.employee')}</Typography>
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

            {hasActiveOrders(row) && (
              <Stack spacing={1} sx={{ mb: 3 }}>
                <LoadingButton
                  fullWidth
                  variant="contained"
                  color="info"
                  size="large"
                  loading={busyStatus === 'on_the_way'}
                  startIcon={<DeliveryIcon />}
                  onClick={() => updateStatus('on_the_way')}
                >
                  {t('orderExtra.onTheWayAction')}
                </LoadingButton>
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
  selected,
  selectable,
  canManage,
  onSelectRow,
  onMenuOpen,
}: {
  row: GroupedOrder;
  busy: boolean;
  selected: boolean;
  selectable: boolean;
  canManage: boolean;
  onSelectRow: () => void;
  onMenuOpen: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const { t } = useTranslate('common');
  const cfg = getStatus(row.status);
  const expanded = useBoolean();
  const orderNumber = row.orders?.[0]?.id.slice(0, 8).toUpperCase() ?? row.id.slice(0, 8);
  const expandedItems = (row.orders ?? []).flatMap((order) => order.items);
  const customer = row.orders?.[0];
  const customerAvatar = customer?.user_avatar_url
    ? getImagePreviewUrl(customer.user_avatar_url)
    : getDefaultAvatar(customer?.user_name, customer?.user_id ?? row.id);

  return (
    <>
      <TableRow hover selected={selected}>
        {canManage && (
          <TableCell padding="checkbox">
            <Checkbox checked={selected} disabled={!selectable} onChange={onSelectRow} />
          </TableCell>
        )}

        <TableCell>
          <Typography
            variant="body2"
            sx={{ fontWeight: 500 }}
          >
            #{orderNumber}
          </Typography>
        </TableCell>

        <TableCell>
          <Box sx={{ gap: 2, display: 'flex', alignItems: 'center' }}>
            <Avatar
              alt={customer?.user_name ?? 'Foydalanuvchi'}
              src={customerAvatar}
              sx={{ width: 40, height: 40 }}
            />
            <ListItemText
              primary={customer?.user_name ?? 'Foydalanuvchi'}
              secondary={customer?.user_phone ?? '—'}
              slotProps={{
                primary: { noWrap: true, sx: { typography: 'body2' } },
                secondary: { noWrap: true, sx: { color: 'text.disabled' } },
              }}
            />
          </Box>
        </TableCell>

        <TableCell>
          <ListItemText
            primary={fDate(row.delivery_time)}
            secondary={fDateTime(row.created_at, 'HH:mm')}
            slotProps={{
              primary: { noWrap: true, sx: { typography: 'body2' } },
              secondary: { sx: { mt: 0.5, typography: 'caption' } },
            }}
          />
        </TableCell>

        <TableCell align="center">{row.total_items}</TableCell>

        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {fSom(row.total_amount)}
          </Typography>
        </TableCell>

        <TableCell>
          <Label variant="soft" color={cfg.color}>
            {t(`orderExtra.kitchenStatus.${cfg.label}`, { defaultValue: cfg.label })}
          </Label>
        </TableCell>

        <TableCell align="right" sx={{ px: 1, whiteSpace: 'nowrap' }}>
          <IconButton
            color={expanded.value ? 'inherit' : 'default'}
            onClick={expanded.onToggle}
            sx={{ ...(expanded.value && { bgcolor: 'action.hover' }) }}
          >
            <Iconify
              icon="eva:arrow-ios-downward-fill"
              sx={{
                transition: 'transform 0.2s',
                transform: expanded.value ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </IconButton>
          {canManage && (
            <IconButton size="small" onClick={onMenuOpen} disabled={busy}>
              {busy ? <CircularProgress size={18} /> : <Iconify icon="eva:more-vertical-fill" />}
            </IconButton>
          )}
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell colSpan={canManage ? 8 : 7} sx={{ p: 0, border: 'none' }}>
          <Collapse
            in={expanded.value}
            timeout="auto"
            unmountOnExit
            sx={{ bgcolor: 'background.neutral' }}
          >
            <Paper sx={{ m: 1.5, overflow: 'hidden' }}>
              {expandedItems.map((item, index) => (
                <Box
                  key={`${item.id}-${index}`}
                  sx={(theme) => ({
                    display: 'flex',
                    alignItems: 'center',
                    p: theme.spacing(1.5, 2, 1.5, 1.5),
                    '&:not(:last-of-type)': {
                      borderBottom: `solid 2px ${theme.vars.palette.background.neutral}`,
                    },
                  })}
                >
                  <Avatar
                    src={item.imageUrl ? getImagePreviewUrl(item.imageUrl) : undefined}
                    variant="rounded"
                    sx={{
                      width: 48,
                      height: 48,
                      mr: 2,
                      bgcolor: 'primary.lighter',
                      color: 'primary.dark',
                    }}
                  >
                    <Iconify icon="solar:tea-cup-bold" width={20} />
                  </Avatar>

                  <ListItemText
                    primary={item.name}
                    secondary={`#${item.id.slice(0, 8).toUpperCase()}`}
                    slotProps={{
                      primary: { sx: { typography: 'body2' } },
                      secondary: { sx: { color: 'text.disabled' } },
                    }}
                  />

                  <Box sx={{ minWidth: 48, textAlign: 'right' }}>×{item.quantity}</Box>
                  <Box sx={{ width: 130, textAlign: 'right', fontWeight: 500 }}>
                    {fSom(item.price)}
                  </Box>
                </Box>
              ))}
            </Paper>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

// ----------------------------------------------------------------------

type OrdersViewScope = 'kitchen' | 'super_admin' | 'company_admin';

type CompanyFilterOption = { id: string; name: string };
type BranchFilterOption = { id: string; company_id: string; name: string };

function CompanyCascadeFilterItem({
  company,
  branches,
  selectedCompanyId,
  selectedBranchId,
  showBranches,
  onCompanySelect,
  onBranchSelect,
}: {
  company: CompanyFilterOption;
  branches: BranchFilterOption[];
  selectedCompanyId: string;
  selectedBranchId: string;
  showBranches: boolean;
  onCompanySelect: (companyId: string) => void;
  onBranchSelect: (companyId: string, branchId: string) => void;
}) {
  const { open, onOpen, onClose, anchorEl, elementRef } = usePopoverHover<HTMLLIElement>();

  return (
    <>
      <MenuItem
        ref={elementRef}
        selected={selectedCompanyId === company.id && !selectedBranchId}
        sx={{ borderRadius: 1 }}
        onClick={() => onCompanySelect(company.id)}
        onMouseEnter={onOpen}
        onMouseLeave={onClose}
      >
        <Typography variant="body2" noWrap sx={{ flex: 1 }}>
          {company.name}
        </Typography>
        {showBranches && (
          <Iconify icon="eva:arrow-ios-forward-fill" width={18} sx={{ ml: 1, color: 'text.disabled' }} />
        )}
      </MenuItem>

      {showBranches && (
        <NavDropdown
          disableScrollLock
          open={open}
          anchorEl={anchorEl}
          onClose={onClose}
          anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
          transformOrigin={{ vertical: 'center', horizontal: 'left' }}
          slotProps={{ paper: { onMouseEnter: onOpen, onMouseLeave: onClose } }}
          sx={{ '--nav-dropdown-width': '220px' }}
        >
          <NavDropdownPaper sx={{ p: 1 }}>
            <MenuList disablePadding sx={{ gap: 0.5 }}>
              <MenuItem
                selected={selectedCompanyId === company.id && !selectedBranchId}
                sx={{ borderRadius: 1 }}
                onClick={() => onCompanySelect(company.id)}
              >
                Barcha filiallar
              </MenuItem>
              {branches.map((branch) => (
                <MenuItem
                  key={branch.id}
                  selected={selectedBranchId === branch.id}
                  sx={{ borderRadius: 1 }}
                  onClick={() => onBranchSelect(company.id, branch.id)}
                >
                  {branch.name}
                </MenuItem>
              ))}
            </MenuList>
          </NavDropdownPaper>
        </NavDropdown>
      )}
    </>
  );
}

export function KitchenOrdersView({ scope = 'kitchen' }: { scope?: OrdersViewScope }) {
  const { t } = useTranslate('common');
  useAuthContext();
  const canManageOrders = scope !== 'company_admin';
  const table = useTable({ defaultRowsPerPage: 5 });

  const [tabStatus, setTabStatus] = useState('all');
  const [selectedRow, setSelectedRow] = useState<GroupedOrder | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [activeRow, setActiveRow] = useState<GroupedOrder | null>(null);
  const rowMenu = usePopover();
  const toolbarMenu = usePopover();
  const companySelect = usePopoverHover<HTMLDivElement>();

  const [searchText, setSearchText] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(() => dayjs());
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(() => dayjs());
  const debouncedSearch = useDebounce(searchText, 300);

  const allOrdersParams = {
    start_date: startDate?.isValid() ? startDate.format('YYYY-MM-DD') : '1900-01-01',
    end_date: endDate?.isValid() ? endDate.format('YYYY-MM-DD') : '2100-12-31',
    limit: 1_000_000,
    offset: 0,
  };
  const isSingleDay = Boolean(
    startDate?.isValid() && endDate?.isValid() && startDate.isSame(endDate, 'day')
  );
  const superAdminOrdersParams = {
    ...allOrdersParams,
    limit: isSingleDay ? 100 : allOrdersParams.limit,
    target_date: isSingleDay ? startDate?.format('YYYY-MM-DD') : undefined,
    start_date: isSingleDay ? undefined : allOrdersParams.start_date,
    end_date: isSingleDay ? undefined : allOrdersParams.end_date,
  };
  const kitchenQuery = useKitchenOrders(undefined, scope === 'kitchen');
  const companyQuery = useCompanyOrders(allOrdersParams, scope === 'company_admin');
  const superAdminQuery = useSuperAdminOrders(superAdminOrdersParams, scope === 'super_admin');
  const superAdminCompaniesQuery = useCompanies({ limit: 100 }, scope === 'super_admin');
  const superAdminBranchesQuery = useBranches({ limit: 100 }, scope === 'super_admin');
  const { data: kitchenMe } = useKitchenMe(scope === 'kitchen');
  const kitchenStatusMutation = useUpdateOrderStatus();
  const superAdminStatusMutation = useUpdateSuperAdminOrderStatus();

  const kitchenOrders = scope === 'kitchen'
    ? kitchenQuery.data
    : scope === 'super_admin'
      ? superAdminQuery.data?.items
      : companyQuery.data?.items;
  const loading = scope === 'kitchen'
    ? kitchenQuery.isLoading
    : scope === 'super_admin'
      ? superAdminQuery.isLoading
      : companyQuery.isLoading;

  const kitchenName = kitchenMe?.name ?? '—';

  const companiesFromOrders = useMemo(() => {
    const companyMap = new Map<string, string>();
    (kitchenOrders ?? []).forEach((order) => {
      if (order.company_id) {
        companyMap.set(order.company_id, order.company_name ?? order.company_id);
      }
    });
    return Array.from(companyMap, ([id, name]) => ({ id, name }));
  }, [kitchenOrders]);
  const companies = scope === 'super_admin'
    ? superAdminCompaniesQuery.data?.items ?? []
    : companiesFromOrders;

  const branchesFromOrders = useMemo(() => {
    const branchMap = new Map<string, { name: string; company_id: string }>();
    (kitchenOrders ?? []).forEach((order) => {
      if (order.branch_id && (!companyFilter || order.company_id === companyFilter)) {
        branchMap.set(order.branch_id, {
          name: order.branch_name ?? order.branch_id,
          company_id: order.company_id ?? '',
        });
      }
    });
    return Array.from(branchMap, ([id, branch]) => ({ id, ...branch }));
  }, [companyFilter, kitchenOrders]);
  const allBranches = useMemo(
    () => scope === 'super_admin' ? superAdminBranchesQuery.data?.items ?? [] : branchesFromOrders,
    [branchesFromOrders, scope, superAdminBranchesQuery.data?.items]
  );
  const branches = useMemo(
    () => allBranches.filter(
      (branch) => !companyFilter || branch.company_id === companyFilter
    ),
    [allBranches, companyFilter]
  );

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

  const groupedOrders = useMemo(() => {
    const rows: GroupedOrder[] = filteredOrders.map((order) => {
      const branchId = order.branch_id ?? order.kitchen_id;
      const items = order.items?.length
        ? order.items.map((item) => ({
            id: item.meal_id,
            name: item.meal_name ?? 'Taom',
            imageUrl: item.meal_image_url,
            quantity: item.quantity,
            price: parseFloat(item.historical_price),
          }))
        : order.meal_name
          ? [{
              id: order.meal_id,
              name: order.meal_name,
              imageUrl: order.meal_image_url,
              quantity: 1,
              price: parseFloat(order.historical_price),
            }]
          : [];
      const childOrder: Order = {
        id: order.id,
        user_id: order.employee_id,
        user_name: order.employee_name,
        user_phone: order.employee_phone,
        user_avatar_url: order.employee_avatar_url,
        total_price: parseFloat(order.historical_price),
        note: null,
        status: order.status,
        items,
      };

      return {
        id: order.id,
        status: order.status,
        total_orders: 1,
        total_items: items.reduce((sum, item) => sum + item.quantity, 0),
        total_amount: parseFloat(order.historical_price),
        delivery_time: order.target_date,
        created_at: order.created_at,
        branch: {
          id: branchId,
          name: order.branch_name ?? '—',
          company_id: order.company_id ?? '',
          company_name: order.company_name,
        },
        kitchen: { id: order.kitchen_id, name: order.kitchen_name ?? kitchenName },
        orders: [childOrder],
      };
    });

    return rows;
  }, [filteredOrders, kitchenName]);

  const tabCount = (val: string) => {
    if (val === 'all')    return groupedOrders.length;
    if (val === 'active') return groupedOrders.filter(hasActiveOrders).length;
    return groupedOrders.filter((g) => g.status === val).length;
  };

  const filtered = useMemo(() => {
    let result = groupedOrders;
    if (tabStatus === 'active') result = result.filter(hasActiveOrders);
    else if (tabStatus !== 'all') result = result.filter((g) => g.status === tabStatus);
    return result;
  }, [groupedOrders, tabStatus]);

  const paged = filtered.slice(
    table.page * table.rowsPerPage,
    table.page * table.rowsPerPage + table.rowsPerPage
  );

  const selectableIds = canManageOrders
    ? filtered.filter(canAdvanceOrders).map((row) => row.id)
    : [];
  const selectedAdvanceIds = table.selected.filter((id) => selectableIds.includes(id));
  const handleBulkNextStatus = useCallback(async () => {
    const ids = selectedAdvanceIds;
    if (!ids.length) return;
    setBusyId('bulk');
    try {
      await Promise.all(ids.map((id) => {
        const group = groupedOrders.find((item) => item.id === id);
        if (!group) return Promise.resolve({ updated: 0 });
        const status: OrderStatus = group.orders?.some((order) => order.status === 'created')
          ? 'preparing'
          : group.orders?.some((order) => order.status === 'preparing')
            ? 'on_the_way'
            : 'delivered';
        const sourceStatus = status === 'preparing'
          ? 'created'
          : status === 'on_the_way'
            ? 'preparing'
            : 'on_the_way';
        return Promise.all(
          (group.orders ?? [])
            .filter((order) => order.status === sourceStatus)
            .map((order) => (scope === 'super_admin'
              ? superAdminStatusMutation.mutateAsync({ id: order.id, status })
              : kitchenStatusMutation.mutateAsync({ id: order.id, status })))
        );
      }));
      table.onSelectAllRows(false, []);
      toast.success('Tanlangan buyurtmalar keyingi bosqichga o‘tkazildi');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setBusyId(null);
    }
  }, [
    groupedOrders,
    kitchenStatusMutation,
    scope,
    selectedAdvanceIds,
    superAdminStatusMutation,
    table,
    t,
  ]);

  const handleUpdate = useCallback(async (group: GroupedOrder, status: OrderStatus) => {
    setBusyId(group.id);
    try {
      const sourceStatuses = status === 'preparing'
        ? ['created']
        : status === 'on_the_way'
          ? ['preparing']
          : ['created', 'preparing', 'on_the_way'];
      const targets = (group.orders ?? []).filter((order) => sourceStatuses.includes(order.status));
      await Promise.all(
        targets.map((order) => (scope === 'super_admin'
          ? superAdminStatusMutation.mutateAsync({ id: order.id, status })
          : kitchenStatusMutation.mutateAsync({ id: order.id, status })))
      );
      const updated = targets.length;
      toast.success(`${updated} ta buyurtma holati yangilandi`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setBusyId(null);
    }
  }, [kitchenStatusMutation, scope, superAdminStatusMutation]);

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
        heading={t('order.title')}
        links={[{ name: t('navigation.dashboard'), href: paths.dashboard.root }, { name: t('order.title') }]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        <OrderStatusTabs
          value={tabStatus}
          tabs={STATUS_TABS.map((tab) => ({ ...tab, label: t(`orderExtra.tabs.${tab.label}`) }))}
          counts={Object.fromEntries(
            STATUS_TABS.map((tab) => [tab.value, tabCount(tab.value)])
          )}
          onChange={(value) => {
            setTabStatus(value);
            table.onResetPage();
          }}
        />

        <Box
          sx={{
            p: 2.5,
            gap: 2,
            display: 'grid',
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(3, minmax(0, 1fr))',
            },
          }}
        >
          <Box sx={{ width: 1 }}>
            <Box
              ref={companySelect.elementRef}
              role="button"
              tabIndex={0}
              aria-haspopup="menu"
              aria-expanded={companySelect.open}
              onClick={companySelect.onOpen}
              onMouseEnter={companySelect.onOpen}
              onMouseLeave={companySelect.onClose}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') companySelect.onOpen();
              }}
              sx={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                minHeight: 56,
                px: 1.75,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                cursor: 'pointer',
                '&:hover': { borderColor: 'text.primary' },
              }}
            >
              <Typography
                variant="caption"
                sx={{ position: 'absolute', top: -9, left: 10, px: 0.5, bgcolor: 'background.paper' }}
              >
                {t('map.company')}
              </Typography>
              <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                {branchFilter
                  ? branches.find((branch) => branch.id === branchFilter)?.name
                  : companies.find((company) => company.id === companyFilter)?.name ?? t('map.allCompanies')}
              </Typography>
              <Iconify icon="eva:arrow-ios-downward-fill" width={18} sx={{ color: 'text.disabled' }} />
            </Box>

            <NavDropdown
              disableScrollLock
              open={companySelect.open}
              anchorEl={companySelect.anchorEl}
              onClose={companySelect.onClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              slotProps={{ paper: { onMouseEnter: companySelect.onOpen, onMouseLeave: companySelect.onClose } }}
              sx={{ '--nav-dropdown-width': '280px', '& .MuiPopover-paper': { pt: 1, ml: -0.75 } }}
            >
              <NavDropdownPaper sx={{ p: 1 }}>
                <MenuList disablePadding sx={{ gap: 0.5 }}>
                  <MenuItem
                    selected={!companyFilter}
                    sx={{ borderRadius: 1 }}
                    onClick={() => {
                      setCompanyFilter('');
                      setBranchFilter('');
                      companySelect.onClose();
                      table.onResetPage();
                    }}
                  >
                    {t('map.allCompanies')}
                  </MenuItem>
                  {companies.map((company) => (
                    <CompanyCascadeFilterItem
                      key={company.id}
                      company={company}
                      branches={allBranches.filter((branch) => branch.company_id === company.id)}
                      selectedCompanyId={companyFilter}
                      selectedBranchId={branchFilter}
                      showBranches={scope !== 'kitchen'}
                      onCompanySelect={(companyId) => {
                        setCompanyFilter(companyId);
                        setBranchFilter('');
                        companySelect.onClose();
                        table.onResetPage();
                      }}
                      onBranchSelect={(companyId, branchId) => {
                        setCompanyFilter(companyId);
                        setBranchFilter(branchId);
                        companySelect.onClose();
                        table.onResetPage();
                      }}
                    />
                  ))}
                </MenuList>
              </NavDropdownPaper>
            </NavDropdown>
          </Box>

          <DatePicker
            label={t('orderExtra.startDate')}
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
            label={t('orderExtra.endDate')}
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

          <Box
            sx={{
              gap: 1,
              width: 1,
              display: 'flex',
              alignItems: 'center',
              gridColumn: '1 / -1',
            }}
          >
            <TextField
              fullWidth
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); table.onResetPage(); }}
              placeholder={t('orderExtra.kitchenSearch')}
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
            />

            <IconButton onClick={toolbarMenu.onOpen}>
              <Iconify icon="eva:more-vertical-fill" />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ position: 'relative' }}>
          {canManageOrders && (
            <TableSelectedAction
              dense={table.dense}
              numSelected={selectedAdvanceIds.length}
              rowCount={selectableIds.length}
              onSelectAllRows={(checked) => table.onSelectAllRows(checked, selectableIds)}
              action={
                <Tooltip title="Keyingi bosqich">
                  <span>
                    <IconButton
                      color="primary"
                      disabled={busyId === 'bulk'}
                      onClick={handleBulkNextStatus}
                    >
                      {busyId === 'bulk'
                        ? <CircularProgress size={20} color="inherit" />
                        : <NextStageIcon />}
                    </IconButton>
                  </span>
                </Tooltip>
              }
            />
          )}

          <Scrollbar sx={{ minHeight: 444 }}>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 960 }}>
            <TableHeadCustom
              order={table.order}
              orderBy={table.orderBy}
              headCells={TABLE_HEAD.map((cell) => ({
                ...cell,
                label: cell.label
                  ? t(`orderExtra.kitchenTable.${cell.label}`, { defaultValue: cell.label })
                  : '',
              }))}
              rowCount={selectableIds.length}
              numSelected={selectedAdvanceIds.length}
              onSort={table.onSort}
              onSelectAllRows={canManageOrders
                ? (checked) => table.onSelectAllRows(checked, selectableIds)
                : undefined}
            />
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : paged.map((row) => (
                <GroupedOrderRow
                  key={row.id}
                  row={row}
                  busy={busyId === row.id}
                  selected={table.selected.includes(row.id)}
                  selectable={canAdvanceOrders(row)}
                  canManage={canManageOrders}
                  onSelectRow={() => table.onSelectRow(row.id)}
                  onMenuOpen={(e) => handleMenuOpen(row, e)}
                />
              ))}
              {!loading && filtered.length === 0 && <TableNoData notFound />}
            </TableBody>
            </Table>
          </Scrollbar>
        </Box>

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
        open={toolbarMenu.open}
        anchorEl={toolbarMenu.anchorEl}
        onClose={toolbarMenu.onClose}
        slotProps={{ arrow: { placement: 'right-top' } }}
      >
        <MenuList>
          <MenuItem
            onClick={() => {
              toolbarMenu.onClose();
              window.print();
            }}
          >
            <Iconify icon="solar:printer-minimalistic-bold" />
            Print
          </MenuItem>

          <MenuItem onClick={toolbarMenu.onClose}>
            <Iconify icon="solar:import-bold" />
            Import
          </MenuItem>

          <MenuItem onClick={toolbarMenu.onClose}>
            <Iconify icon="solar:export-bold" />
            Export
          </MenuItem>
        </MenuList>
      </CustomPopover>

      <CustomPopover
        open={rowMenu.open}
        anchorEl={rowMenu.anchorEl}
        onClose={handleMenuClose}
        slotProps={{ arrow: { placement: 'right-top' } }}
      >
        <MenuList sx={{ minWidth: 160 }}>
          {activeRow?.orders?.some((order) => order.status === 'created') && (
            <MenuItem onClick={() => { handleUpdate(activeRow, 'preparing'); handleMenuClose(); }}>
              <Iconify icon="solar:tea-cup-bold" sx={{ mr: 1 }} />
              {t('orderExtra.actions.prepare')}
            </MenuItem>
          )}

          {activeRow?.orders?.some((order) => order.status === 'preparing') &&
            !activeRow.orders.some((order) => order.status === 'created') && (
            <MenuItem onClick={() => { handleUpdate(activeRow, 'on_the_way'); handleMenuClose(); }}>
              <DeliveryIcon />
              {t('orderExtra.actions.sendOnWay')}
            </MenuItem>
          )}

          {activeRow?.orders?.some((order) => order.status === 'on_the_way') &&
            !activeRow.orders.some((order) => ['created', 'preparing'].includes(order.status)) && (
            <MenuItem onClick={() => { handleUpdate(activeRow, 'delivered'); handleMenuClose(); }}>
              <Iconify icon="solar:box-minimalistic-bold" sx={{ mr: 1 }} />
              {t('orderExtra.actions.markDelivered')}
            </MenuItem>
          )}

          {activeRow && !['delivered', 'cancelled'].includes(activeRow.status) && (
            <MenuItem
              sx={{ color: 'error.main' }}
              onClick={() => { if (activeRow) handleUpdate(activeRow, 'cancelled'); handleMenuClose(); }}
            >
              <Iconify icon="solar:close-circle-bold" sx={{ mr: 1 }} />
              {t('common.cancel')}
            </MenuItem>
          )}
        </MenuList>
      </CustomPopover>

      <OrderDetailDrawer
        row={selectedRow}
        onClose={() => setSelectedRow(null)}
      />
    </DashboardContent>
  );
}
