'use client';

import type { AccountStatus } from 'src/lib/api/orders';

import { useState } from 'react';
import { usePopover } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useTranslate } from 'src/locales';
import { DashboardContent } from 'src/layouts/dashboard';

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
  TableSelectedAction,
  TablePaginationCustom,
} from 'src/components/table';

import { useCompanyEmployees, useUpdateEmployeeStatus } from '../hooks/use-employees';

// ----------------------------------------------------------------------

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  approved:         'success',
  pending_approval: 'warning',
  inactive:         'error',
  rejected:         'error',
};

function avatarInitials(name: string | null, phone: string) {
  return name ? name.charAt(0).toUpperCase() : phone.charAt(phone.length - 1);
}

// ----------------------------------------------------------------------

type RowProps = {
  row: {
    id: string;
    phone: string;
    name: string | null;
    role: string;
    account_status: AccountStatus | null;
  };
  selected: boolean;
  onSelectRow: () => void;
};

function EmployeeRow({ row, selected, onSelectRow }: RowProps) {
  const popover = usePopover();
  const updateStatus = useUpdateEmployeeStatus();
  const { t } = useTranslate();

  const handle = async (status: AccountStatus) => {
    popover.onClose();
    const labels: Record<string, string> = {
      approved: t('employee.approved'),
      inactive: t('employee.deactivated'),
      rejected: t('employee.rejected'),
    };
    try {
      await updateStatus.mutateAsync({ id: row.id, status });
      toast.success(labels[status] ?? 'Yangilandi');
    } catch {
      toast.error(t('common.error'));
    }
  };

  const color = STATUS_COLOR[row.account_status ?? ''] ?? 'default';
  const label = row.account_status ? t(`status.${row.account_status}`) : '—';
  const isPending  = row.account_status === 'pending_approval';
  const isApproved = row.account_status === 'approved';
  const isInactive = row.account_status === 'inactive';

  return (
    <>
      <TableRow hover selected={selected} tabIndex={-1}>
        <TableCell padding="checkbox">
          <Checkbox
            checked={selected}
            onClick={onSelectRow}
            slotProps={{ input: { 'aria-label': `${row.id} checkbox` } }}
          />
        </TableCell>

        <TableCell>
          <Box sx={{ gap: 2, display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ width: 36, height: 36, fontSize: 14 }}>
              {avatarInitials(row.name, row.phone)}
            </Avatar>
            <Stack sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                {row.name ?? '—'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                {row.phone}
              </Typography>
            </Stack>
          </Box>
        </TableCell>

        <TableCell sx={{ color: 'text.secondary' }}>{row.phone}</TableCell>

        <TableCell>
          <Label variant="soft" color="default">
            {row.role === 'employee' ? t('employee.singular') : row.role}
          </Label>
        </TableCell>

        <TableCell>
          <Label variant="soft" color={color}>{label}</Label>
        </TableCell>

        <TableCell>
          <IconButton size="small" color={popover.open ? 'inherit' : 'default'} onClick={popover.onOpen}>
            <Iconify icon="eva:more-vertical-fill" />
          </IconButton>
        </TableCell>
      </TableRow>

      <CustomPopover
        open={popover.open}
        anchorEl={popover.anchorEl}
        onClose={popover.onClose}
        slotProps={{ arrow: { placement: 'right-top' } }}
      >
        <MenuList>
          {isPending && (
            <MenuItem onClick={() => handle('approved')} sx={{ color: 'success.main' }}>
              <Iconify icon="solar:check-circle-bold" sx={{ mr: 1 }} />
              {t('common.approve')}
            </MenuItem>
          )}
          {isPending && (
            <MenuItem onClick={() => handle('rejected')} sx={{ color: 'error.main' }}>
              <Iconify icon="solar:close-circle-bold" sx={{ mr: 1 }} />
              {t('common.reject')}
            </MenuItem>
          )}
          {isApproved && (
            <MenuItem onClick={() => handle('inactive')} sx={{ color: 'warning.main' }}>
              <Iconify icon="solar:forbidden-circle-bold" sx={{ mr: 1 }} />
              {t('common.deactivate')}
            </MenuItem>
          )}
          {isInactive && (
            <MenuItem onClick={() => handle('approved')} sx={{ color: 'success.main' }}>
              <Iconify icon="solar:restart-bold" sx={{ mr: 1 }} />
              {t('common.activate')}
            </MenuItem>
          )}
        </MenuList>
      </CustomPopover>
    </>
  );
}

// ----------------------------------------------------------------------

export function EmployeesListView() {
  const { t } = useTranslate();
  const table = useTable({ defaultRowsPerPage: 10 });
  const [tabStatus, setTabStatus] = useState<AccountStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, error } = useCompanyEmployees({ limit: 100, offset: 0 });

  const employees = data?.items ?? [];
  const statusTabs: { value: AccountStatus | 'all'; label: string }[] = [
    { value: 'all', label: t('common.all') },
    { value: 'approved', label: t('status.approved') },
    { value: 'pending_approval', label: t('status.pending_approval') },
    { value: 'inactive', label: t('status.inactive') },
    { value: 'rejected', label: t('status.rejected') },
  ];
  const tableHead = [
    { id: 'name', label: t('employee.singular') },
    { id: 'phone', label: t('field.phone'), width: 150 },
    { id: 'role', label: t('field.role'), width: 130 },
    { id: 'status', label: t('common.status'), width: 140 },
    { id: 'actions', label: '', width: 72 },
  ];

  const dataFiltered = employees
    .filter((employee) => tabStatus === 'all' || employee.account_status === tabStatus)
    .filter((e) => !search ||
        (e.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        e.phone.toLowerCase().includes(search.toLowerCase())
      );
  const paged = dataFiltered.slice(
    table.page * table.rowsPerPage,
    table.page * table.rowsPerPage + table.rowsPerPage
  );
  const statusCount = (status: AccountStatus | 'all') =>
    status === 'all'
      ? employees.length
      : employees.filter((employee) => employee.account_status === status).length;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={t('navigation.employees')}
        links={[
          { name: t('navigation.dashboard'), href: paths.dashboard.root },
          { name: t('navigation.employees') },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.employee.new}
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            {t('employee.add')}
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error instanceof Error ? error.message : t('employee.loadError')}
        </Alert>
      )}

      <Card>
        <Tabs
          value={tabStatus}
          onChange={(_, val) => { setTabStatus(val); table.onResetPage(); }}
          sx={{ px: 2.5, borderBottom: 1, borderColor: 'divider' }}
        >
          {statusTabs.map((tab) => (
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
                  {statusCount(tab.value)}
                </Label>
              }
            />
          ))}
        </Tabs>

        <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('employee.searchPlaceholder')}
            sx={{ width: { xs: 1, md: 320 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>

        <Box sx={{ position: 'relative' }}>
          <TableSelectedAction
            dense={table.dense}
            numSelected={table.selected.length}
            rowCount={dataFiltered.length}
            onSelectAllRows={(checked) =>
              table.onSelectAllRows(checked, dataFiltered.map((r) => r.id))
            }
            action={null}
          />

          <Scrollbar sx={{ minHeight: isLoading || dataFiltered.length === 0 ? 240 : 0 }}>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 800 }}>
              <TableHeadCustom
                order={table.order}
                orderBy={table.orderBy}
                headCells={tableHead}
                rowCount={dataFiltered.length}
                numSelected={table.selected.length}
                onSort={table.onSort}
                onSelectAllRows={(checked) =>
                  table.onSelectAllRows(checked, dataFiltered.map((r) => r.id))
                }
              />

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map((row) => (
                    <EmployeeRow
                      key={row.id}
                      row={row}
                      selected={table.selected.includes(row.id)}
                      onSelectRow={() => table.onSelectRow(row.id)}
                    />
                  ))
                )}

                {!isLoading && dataFiltered.length === 0 && <TableNoData notFound />}
              </TableBody>
            </Table>
          </Scrollbar>
        </Box>

        <TablePaginationCustom
          page={table.page}
          dense={table.dense}
          count={dataFiltered.length}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          onChangeDense={table.onChangeDense}
          onRowsPerPageChange={table.onChangeRowsPerPage}
        />
      </Card>
    </DashboardContent>
  );
}
