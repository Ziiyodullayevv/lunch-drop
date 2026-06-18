'use client';

import type { SelectChangeEvent } from '@mui/material/Select';
import type { OrderStatus } from 'src/lib/api/orders';

import dayjs from 'dayjs';
import { useState } from 'react';
import { useDebounce } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
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

import { useBranches } from 'src/sections/branch/hooks/use-branches';
import { useKitchens } from 'src/sections/kitchen/hooks/use-kitchens';
import { useCompanies } from 'src/sections/company/hooks/use-companies';

import { OrderAnalytics } from './order-analytics';
import { OrderStatusTabs } from './order-status-tabs';
import { useSuperAdminOrders } from '../hooks/use-orders';

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
  { id: 'company',  label: 'Kompaniya / filial', width: 180 },
  { id: 'kitchen',  label: 'Oshxona',            width: 140 },
  { id: 'employee', label: 'Xodim',               width: 150 },
  { id: 'meal',     label: 'Taom',                width: 100 },
  { id: 'date',     label: 'Sana',                width: 110 },
  { id: 'price',    label: 'Narx',                width: 120 },
  { id: 'status',   label: 'Holat',               width: 110 },
  { id: 'actions',  label: '',                    width: 56 },
];

// ----------------------------------------------------------------------

export function SuperAdminOrdersView() {
  const table = useTable({ defaultRowsPerPage: 10 });
  const [tabStatus, setTabStatus] = useState<OrderStatus | 'all'>('all');
  const [companyFilter, setCompanyFilter] = useState('');
  const [kitchenFilter, setKitchenFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(null);
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(dayjs());
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
  const orders = data?.items ?? [];
  const total = data?.total ?? 0;
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
        heading="Buyurtmalar"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Buyurtmalar' },
        ]}
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
            <InputLabel>Kompaniya</InputLabel>
            <Select
              label="Kompaniya"
              value={companyFilter}
              disabled={isCompaniesLoading}
              onChange={(event: SelectChangeEvent<string>) => {
                setCompanyFilter(event.target.value);
                setBranchFilter('');
                table.onResetPage();
              }}
            >
              <MenuItem value="">Barchasi</MenuItem>
              {companies.map((company) => (
                <MenuItem key={company.id} value={company.id}>
                  {company.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ width: 1 }}>
            <InputLabel>Filial</InputLabel>
            <Select
              label="Filial"
              value={branchFilter}
              disabled={isBranchesLoading}
              onChange={(event: SelectChangeEvent<string>) => {
                setBranchFilter(event.target.value);
                table.onResetPage();
              }}
            >
              <MenuItem value="">Barchasi</MenuItem>
              {branches.map((branch) => (
                <MenuItem key={branch.id} value={branch.id}>
                  {branch.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ width: 1 }}>
            <InputLabel>Oshxona</InputLabel>
            <Select
              label="Oshxona"
              value={kitchenFilter}
              disabled={isKitchensLoading}
              onChange={(event: SelectChangeEvent<string>) => {
                setKitchenFilter(event.target.value);
                table.onResetPage();
              }}
            >
              <MenuItem value="">Barchasi</MenuItem>
              {kitchens.map((kitchen) => (
                <MenuItem key={kitchen.id} value={kitchen.id}>
                  {kitchen.name}
                </MenuItem>
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
            onChange={(event) => {
              setSearchText(event.target.value);
              table.onResetPage();
            }}
            placeholder="Kompaniya, filial, oshxona, xodim yoki taom bo'yicha..."
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
              Tozalash
            </Button>
          )}
        </Box>

        <Scrollbar sx={{ minHeight: 444 }}>
          <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 900 }}>
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
                  <TableCell colSpan={TABLE_HEAD.length} align="center" sx={{ py: 8 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell>
                      <Stack spacing={0.25}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {order.company_name ?? '—'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {order.branch_name ?? '—'}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">{order.kitchen_name ?? '—'}</Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">{order.employee_name ?? '—'}</Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">{order.meal_name ?? '—'}</Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">{fDate(order.target_date)}</Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {fCurrency(Number(order.historical_price))}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={STATUS_LABEL[order.status] ?? order.status}
                        color={STATUS_COLOR[order.status] ?? 'default'}
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
