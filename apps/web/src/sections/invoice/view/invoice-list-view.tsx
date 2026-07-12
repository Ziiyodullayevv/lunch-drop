'use client';

import type { TableHeadCellProps } from 'src/components/table';
import type { IInvoice, IInvoiceTableFilters } from 'src/types/invoice';

import { sumBy } from 'es-toolkit';
import { useCallback } from 'react';
import { varAlpha } from 'minimal-shared/utils';
import { useSetState } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import { useTheme } from '@mui/material/styles';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';

import { fIsAfter, fIsBetween } from 'src/utils/format-time';

import { useTranslate } from 'src/locales';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  emptyRows,
  TableNoData,
  getComparator,
  TableEmptyRows,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

import { useInvoices } from '../hooks/use-invoices';
import { InvoiceAnalytic } from '../invoice-analytic';
import { InvoiceTableRow } from '../invoice-table-row';
import { InvoiceTableToolbar } from '../invoice-table-toolbar';
import { InvoiceTableFiltersResult } from '../invoice-table-filters-result';

// ----------------------------------------------------------------------

const TABLE_HEAD: TableHeadCellProps[] = [
  { id: 'invoiceNumber', label: 'Kompaniya / invoice' },
  { id: 'createDate', label: 'Boshlanish sanasi' },
  { id: 'dueDate', label: 'Tugash sanasi' },
  { id: 'subtotal', label: 'Oshxona foydasi' },
  { id: 'taxes', label: 'Tizim fee' },
  { id: 'totalAmount', label: 'Jami xarajat' },
  { id: 'status', label: 'Holat' },
];

// ----------------------------------------------------------------------

export function InvoiceListView() {
  const { t } = useTranslate('common');
  const theme = useTheme();

  const table = useTable({ defaultOrderBy: 'createDate' });

  const { data: invoicesData, isLoading, isError, error } = useInvoices();
  const tableData: IInvoice[] = (invoicesData ?? []).map((inv) => ({
    id: inv.id,
    invoiceNumber: `INV-${inv.id.slice(0, 6).toUpperCase()}`,
    createDate: inv.period_start,
    dueDate: inv.period_end,
    status: inv.status === 'paid' ? 'paid' : 'pending',
    totalAmount: parseFloat(inv.total_company_expense),
    sent: 0,
    invoiceFrom: {
      id: '',
      name: '',
      email: '',
      fullAddress: '',
      phoneNumber: '',
      company: '',
      addressType: '',
      primary: true,
    },
    invoiceTo: {
      id: inv.company_id,
      name: inv.company_id,
      email: '',
      fullAddress: '',
      phoneNumber: '',
      company: inv.company_id,
      addressType: '',
      primary: true,
    },
    branchSummary: `${inv.branch_summaries?.length ?? 0} ta filial · ${inv.employee_summaries?.length ?? 0} ta xodim`,
    items: [],
    taxes: parseFloat(inv.total_system_fee),
    discount: 0,
    shipping: 0,
    subtotal: parseFloat(inv.total_kitchen_profit),
  }));

  const filters = useSetState<IInvoiceTableFilters>({
    name: '',
    service: [],
    status: 'all',
    startDate: null,
    endDate: null,
  });
  const { state: currentFilters, setState: updateFilters } = filters;

  const dateError = fIsAfter(currentFilters.startDate, currentFilters.endDate);

  const dataFiltered = applyFilter({
    inputData: tableData,
    comparator: getComparator(table.order, table.orderBy),
    filters: currentFilters,
    dateError,
  });

  const canReset =
    !!currentFilters.name ||
    currentFilters.status !== 'all' ||
    (!!currentFilters.startDate && !!currentFilters.endDate);

  const notFound = !isLoading && ((!dataFiltered.length && canReset) || !dataFiltered.length);

  const getInvoiceLength = (status: string) =>
    tableData.filter((item) => item.status === status).length;

  const getTotalAmount = (status: string) =>
    sumBy(
      tableData.filter((item) => item.status === status),
      (invoice) => invoice.totalAmount
    );

  const getPercentByStatus = (status: string) =>
    tableData.length ? (getInvoiceLength(status) / tableData.length) * 100 : 0;

  const TABS = [
    {
      value: 'all',
      label: 'Barchasi',
      color: 'default',
      count: tableData.length,
    },
    {
      value: 'paid',
      label: "To'langan",
      color: 'success',
      count: getInvoiceLength('paid'),
    },
    {
      value: 'pending',
      label: 'Kutilmoqda',
      color: 'warning',
      count: getInvoiceLength('pending'),
    },
  ] as const;

  const handleFilterStatus = useCallback(
    (event: React.SyntheticEvent, newValue: string) => {
      table.onResetPage();
      updateFilters({ status: newValue });
    },
    [updateFilters, table]
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={t('invoice.title')}
        links={[{ name: t('navigation.dashboard'), href: paths.dashboard.root }, { name: t('invoice.title') }]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error instanceof Error ? error.message : t('invoice.loadError')}
        </Alert>
      )}

      <Card sx={{ mb: { xs: 3, md: 5 } }}>
        <Scrollbar sx={{ minHeight: 108 }}>
          <Stack
            divider={<Divider orientation="vertical" flexItem sx={{ borderStyle: 'dashed' }} />}
            sx={{ py: 2, flexDirection: 'row' }}
          >
            <InvoiceAnalytic
              title={t('invoice.total')}
              total={tableData.length}
              percent={100}
              price={sumBy(tableData, (invoice) => invoice.totalAmount)}
              icon="solar:bill-list-bold-duotone"
              color={theme.vars.palette.info.main}
            />

            <InvoiceAnalytic
              title={t('invoice.paid')}
              total={getInvoiceLength('paid')}
              percent={getPercentByStatus('paid')}
              price={getTotalAmount('paid')}
              icon="solar:file-check-bold-duotone"
              color={theme.vars.palette.success.main}
            />

            <InvoiceAnalytic
              title={t('invoice.pending')}
              total={getInvoiceLength('pending')}
              percent={getPercentByStatus('pending')}
              price={getTotalAmount('pending')}
              icon="solar:sort-by-time-bold-duotone"
              color={theme.vars.palette.warning.main}
            />
          </Stack>
        </Scrollbar>
      </Card>

      <Card>
        <Tabs
          value={currentFilters.status}
          onChange={handleFilterStatus}
          sx={{
            px: { md: 2.5 },
            boxShadow: `inset 0 -2px 0 0 ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
          }}
        >
          {TABS.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
          label={t(`invoice.status.${tab.value}`)}
              iconPosition="end"
              icon={
                <Label
                  variant={
                    ((tab.value === 'all' || tab.value === currentFilters.status) && 'filled') ||
                    'soft'
                  }
                  color={tab.color}
                >
                  {tab.count}
                </Label>
              }
            />
          ))}
        </Tabs>

        <InvoiceTableToolbar
          filters={filters}
          dateError={dateError}
          onResetPage={table.onResetPage}
        />

        {canReset && (
          <InvoiceTableFiltersResult
            filters={filters}
            onResetPage={table.onResetPage}
            totalResults={dataFiltered.length}
            sx={{ p: 2.5, pt: 0 }}
          />
        )}

        <Box sx={{ position: 'relative' }}>
          <Scrollbar sx={{ minHeight: 444 }}>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 800 }}>
              <TableHeadCustom
                order={table.order}
                orderBy={table.orderBy}
                headCells={TABLE_HEAD.map((cell) => ({ ...cell, label: t(`invoice.table.${cell.id}`) }))}
                rowCount={dataFiltered.length}
                numSelected={0}
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
                  dataFiltered
                    .slice(
                      table.page * table.rowsPerPage,
                      table.page * table.rowsPerPage + table.rowsPerPage
                    )
                    .map((row) => <InvoiceTableRow key={row.id} row={row} />)
                )}

                <TableEmptyRows
                  height={table.dense ? 56 : 56 + 20}
                  emptyRows={emptyRows(table.page, table.rowsPerPage, dataFiltered.length)}
                />

                <TableNoData notFound={notFound} />
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

// ----------------------------------------------------------------------

type ApplyFilterProps = {
  dateError: boolean;
  inputData: IInvoice[];
  filters: IInvoiceTableFilters;
  comparator: (a: any, b: any) => number;
};

function applyFilter({ inputData, comparator, filters, dateError }: ApplyFilterProps) {
  const { name, status, startDate, endDate } = filters;

  const stabilizedThis = inputData.map((el, index) => [el, index] as const);

  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  inputData = stabilizedThis.map((el) => el[0]);

  if (name) {
    inputData = inputData.filter(({ invoiceNumber, invoiceTo }) =>
      [invoiceNumber, invoiceTo.name, invoiceTo.company, invoiceTo.phoneNumber].some((field) =>
        field?.toLowerCase().includes(name.toLowerCase())
      )
    );
  }

  if (status !== 'all') {
    inputData = inputData.filter((invoice) => invoice.status === status);
  }

  if (!dateError) {
    if (startDate && endDate) {
      inputData = inputData.filter((invoice) => fIsBetween(invoice.createDate, startDate, endDate));
    }
  }

  return inputData;
}
