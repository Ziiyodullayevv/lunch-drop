'use client';

import type { SelectChangeEvent } from '@mui/material/Select';
import type { OrderRead, OrderStatus } from 'src/lib/api/orders';

import dayjs from 'dayjs';
import { useMemo, Fragment, useState } from 'react';
import { usePopover, useDebounce } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
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
import FormControl from '@mui/material/FormControl';
import InputAdornment from '@mui/material/InputAdornment';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { useTranslate } from 'src/locales';
import { orderItemsLabel } from 'src/lib/api/orders';
import { DashboardContent } from 'src/layouts/dashboard';
import { emptyOrderAnalytics } from 'src/lib/order-analytics';

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

import { useBranches } from 'src/sections/branch/hooks/use-branches';
import { useKitchens } from 'src/sections/kitchen/hooks/use-kitchens';
import { useCompanies } from 'src/sections/company/hooks/use-companies';

import { OrderAnalytics } from './order-analytics';
import { OrderStatusTabs } from './order-status-tabs';
import {
  useSuperAdminOrders,
  useUpdateSuperAdminBranchOrderStatus,
} from '../hooks/use-orders';

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


type BranchOrderGroup = {
  id: string;
  branchId: string;
  branchName: string;
  companyName: string;
  targetDate: string;
  kitchenNames: string[];
  status: OrderStatus | 'mixed';
  totalAmount: number;
  orders: OrderRead[];
};

function BranchStatusDropdown({
  status,
  loading,
  onChange,
}: {
  status: OrderStatus | 'mixed';
  loading: boolean;
  onChange: (status: OrderStatus) => void;
}) {
  const menu = usePopover();

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        color="inherit"
        disabled={loading}
        endIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}
        onClick={menu.onOpen}
        sx={{ minWidth: 170, justifyContent: 'space-between' }}
      >
        {status === 'mixed' ? 'Aralash holat' : STATUS_LABEL[status]}
      </Button>
      <CustomPopover
        open={menu.open}
        anchorEl={menu.anchorEl}
        onClose={menu.onClose}
        slotProps={{ arrow: { placement: 'right-top' } }}
      >
        <MenuList sx={{ minWidth: 190 }}>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <MenuItem
              key={value}
              selected={value === status}
              onClick={() => {
                onChange(value as OrderStatus);
                menu.onClose();
              }}
            >
              <Chip
                label={label}
                color={STATUS_COLOR[value] ?? 'default'}
                size="small"
                variant="soft"
              />
            </MenuItem>
          ))}
        </MenuList>
      </CustomPopover>
    </>
  );
}

const TABLE_HEAD = [
  { id: 'company', label: 'companyBranch', width: 180 },
  { id: 'kitchen', label: 'kitchen', width: 140 },
  { id: 'employee', label: 'employee', width: 150 },
  { id: 'meal', label: 'meal', width: 100 },
  { id: 'date', label: 'date', width: 110 },
  { id: 'price', label: 'price', width: 120 },
  { id: 'status', label: 'status', width: 180 },
  { id: 'actions',  label: '',                    width: 56 },
];

// ----------------------------------------------------------------------

export function SuperAdminOrdersView() {
  const { t } = useTranslate('common');
  const table = useTable({ defaultRowsPerPage: 10 });
  const [tabStatus, setTabStatus] = useState<OrderStatus | 'all'>('all');
  const [companyFilter, setCompanyFilter] = useState('');
  const [kitchenFilter, setKitchenFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(null);
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const debouncedSearch = useDebounce(searchText, 300);

  const { data: companiesData, isLoading: isCompaniesLoading } = useCompanies({ limit: 100 });
  const { data: kitchensData, isLoading: isKitchensLoading } = useKitchens({ limit: 100 });
  const { data: branchesData, isLoading: isBranchesLoading } = useBranches({
    limit: 100,
    company_id: companyFilter || undefined,
  });
  const companies = companiesData?.items ?? [];
  const kitchens = kitchensData?.items ?? [];
  const branches = branchesData?.items ?? [];

  const queryParams = {
    company_id: companyFilter || undefined,
    kitchen_id: kitchenFilter || undefined,
    branch_id: branchFilter || undefined,
    order_status: tabStatus === 'all' ? undefined : tabStatus,
    start_date: startDate?.isValid() ? startDate.format('YYYY-MM-DD') : undefined,
    end_date: endDate?.isValid() ? endDate.format('YYYY-MM-DD') : undefined,
    search: debouncedSearch || undefined,
    limit: table.rowsPerPage,
    offset: table.page * table.rowsPerPage,
  };

  const { data, isLoading, isError, error } = useSuperAdminOrders(queryParams);
  const updateBranchStatus = useUpdateSuperAdminBranchOrderStatus();
  const orders = useMemo(() => data?.items ?? [], [data?.items]);
  const total = data?.total ?? 0;
  const statusCounts = data?.status_counts ?? {
    all: tabStatus === 'all' ? total : 0,
    created: tabStatus === 'created' ? total : 0,
    preparing: tabStatus === 'preparing' ? total : 0,
    on_the_way: tabStatus === 'on_the_way' ? total : 0,
    delivered: tabStatus === 'delivered' ? total : 0,
    cancelled: tabStatus === 'cancelled' ? total : 0,
  };
  const groupedOrders = useMemo(() => {
    const groups = new Map<string, BranchOrderGroup>();
    orders.forEach((order) => {
      const branchId = order.branch_id ?? order.company_id ?? 'unknown';
      const key = `${branchId}:${order.target_date}`;
      const existing = groups.get(key);
      if (existing) {
        existing.orders.push(order);
        existing.totalAmount += Number(order.historical_price);
        if (order.kitchen_name && !existing.kitchenNames.includes(order.kitchen_name)) {
          existing.kitchenNames.push(order.kitchen_name);
        }
        if (existing.status !== order.status) existing.status = 'mixed';
        return;
      }
      groups.set(key, {
        id: key,
        branchId,
        branchName: order.branch_name ?? '—',
        companyName: order.company_name ?? '—',
        targetDate: order.target_date,
        kitchenNames: order.kitchen_name ? [order.kitchen_name] : [],
        status: order.status,
        totalAmount: Number(order.historical_price),
        orders: [order],
      });
    });
    return Array.from(groups.values());
  }, [orders]);

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
            gap: 2,
            display: 'grid',
            alignItems: 'center',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(5, minmax(0, 1fr))',
            },
          }}
        >
          <FormControl sx={{ width: 1 }}>
            <InputLabel>{t('map.company')}</InputLabel>
            <Select
              label={t('map.company')}
              value={companyFilter}
              disabled={isCompaniesLoading}
              onChange={(event: SelectChangeEvent<string>) => {
                setCompanyFilter(event.target.value);
                setBranchFilter('');
                table.onResetPage();
              }}
            >
              <MenuItem value="">{t('common.all')}</MenuItem>
              {companies.map((company) => (
                <MenuItem key={company.id} value={company.id}>
                  {company.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ width: 1 }}>
            <InputLabel>{t('map.branch')}</InputLabel>
            <Select
              label={t('map.branch')}
              value={branchFilter}
              disabled={isBranchesLoading}
              onChange={(event: SelectChangeEvent<string>) => {
                setBranchFilter(event.target.value);
                table.onResetPage();
              }}
            >
              <MenuItem value="">{t('common.all')}</MenuItem>
              {branches.map((branch) => (
                <MenuItem key={branch.id} value={branch.id}>
                  {branch.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ width: 1 }}>
            <InputLabel>{t('map.kitchen')}</InputLabel>
            <Select
              label={t('map.kitchen')}
              value={kitchenFilter}
              disabled={isKitchensLoading}
              onChange={(event: SelectChangeEvent<string>) => {
                setKitchenFilter(event.target.value);
                table.onResetPage();
              }}
            >
              <MenuItem value="">{t('common.all')}</MenuItem>
              {kitchens.map((kitchen) => (
                <MenuItem key={kitchen.id} value={kitchen.id}>
                  {kitchen.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

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

          <TextField
            value={searchText}
            onChange={(event) => {
              setSearchText(event.target.value);
              table.onResetPage();
            }}
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
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSearchText('');
                        table.onResetPage();
                      }}
                    >
                      <Iconify icon="solar:close-circle-bold" width={16} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
            sx={{ width: 1, gridColumn: '1 / -1' }}
          />

          {(companyFilter ||
            branchFilter ||
            kitchenFilter ||
            searchText ||
            startDate ||
            !endDate ||
            !endDate.isSame(dayjs(), 'day')) && (
            <Button
              color="inherit"
              startIcon={<Iconify icon="solar:restart-bold" />}
              sx={{ justifySelf: 'start', gridColumn: '1 / -1' }}
              onClick={() => {
                setCompanyFilter('');
                setBranchFilter('');
                setKitchenFilter('');
                setSearchText('');
                setStartDate(null);
                setEndDate(dayjs());
                table.onResetPage();
              }}
            >
            {t('common.clear')}
            </Button>
          )}
        </Box>

        <Scrollbar sx={{ minHeight: 444 }}>
          <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 900 }}>
            <TableHeadCustom
              order={table.order}
              orderBy={table.orderBy}
              headCells={TABLE_HEAD.map((cell) => ({ ...cell, label: cell.label ? t(`orderSuper.${cell.label}`) : '' }))}
              rowCount={groupedOrders.length}
              onSort={table.onSort}
            />

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={TABLE_HEAD.length} align="center" sx={{ py: 8 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : (
                groupedOrders.map((group) => {
                  const expanded = expandedGroupId === group.id;
                  return (
                    <Fragment key={group.id}>
                      <TableRow hover sx={{ bgcolor: 'background.neutral' }}>
                        <TableCell>
                          <Stack spacing={0.25}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {group.companyName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {group.branchName}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {group.kitchenNames.join(', ') || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="subtitle2">{group.orders.length} ta buyurtma</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {group.orders.reduce(
                              (sum, order) => sum + (order.items?.reduce((count, item) => count + item.quantity, 0) ?? 1),
                              0
                            )} ta taom
                          </Typography>
                        </TableCell>
                        <TableCell><Typography variant="body2">{fDate(group.targetDate)}</Typography></TableCell>
                        <TableCell>
                          <Typography variant="subtitle2">{fCurrency(group.totalAmount)}</Typography>
                        </TableCell>
                        <TableCell>
                          <BranchStatusDropdown
                            status={group.status}
                            loading={updateBranchStatus.isPending}
                            onChange={(status) => {
                              updateBranchStatus.mutate(
                                {
                                  branchId: group.branchId,
                                  targetDate: group.targetDate,
                                  status,
                                },
                                {
                                  onSuccess: ({ updated }) => toast.success(
                                    `${group.branchName}: ${updated} ta buyurtma yangilandi`
                                  ),
                                  onError: (mutationError) => toast.error(
                                    mutationError instanceof Error
                                      ? mutationError.message
                                      : 'Xatolik yuz berdi'
                                  ),
                                }
                              );
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            aria-label="Filial buyurtmalarini ochish"
                            onClick={() => setExpandedGroupId(expanded ? null : group.id)}
                          >
                            <Iconify icon={expanded ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={TABLE_HEAD.length} sx={{ p: 0, border: 0 }}>
                          <Collapse in={expanded} timeout="auto" unmountOnExit>
                            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 900 }}>
                              <TableBody>
                                {group.orders.map((order) => (
                                  <TableRow key={order.id} hover>
                                    <TableCell>{order.employee_name ?? '—'}</TableCell>
                                    <TableCell>{order.kitchen_name ?? '—'}</TableCell>
                                    <TableCell colSpan={2}>{orderItemsLabel(order)}</TableCell>
                                    <TableCell>{fDate(order.target_date)}</TableCell>
                                    <TableCell>{fCurrency(Number(order.historical_price))}</TableCell>
                                    <TableCell>
                                      <Chip
                                        label={STATUS_LABEL[order.status]}
                                        color={STATUS_COLOR[order.status]}
                                        size="small"
                                        variant="soft"
                                      />
                                    </TableCell>
                                    <TableCell align="right">
                                      <IconButton
                                        component={RouterLink}
                                        href={paths.dashboard.order.details(order.id)}
                                        aria-label="Buyurtmani ko'rish"
                                      >
                                        <Iconify icon="solar:eye-bold" />
                                      </IconButton>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </Fragment>
                  );
                })
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
