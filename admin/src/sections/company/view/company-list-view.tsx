'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { fDateTime } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  TableNoData,
  TableHeadCustom,
  TableSelectedAction,
  TablePaginationCustom,
} from 'src/components/table';

import { useCompanies, useDeleteCompany } from '../hooks/use-companies';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'name', label: 'Kompaniya nomi' },
  { id: 'description', label: 'Tavsif' },
  { id: 'billing_day', label: "To'lov kuni", width: 130 },
  { id: 'created_at', label: 'Yaratildi', width: 160 },
  { id: 'actions', label: '', width: 100 },
];

// ----------------------------------------------------------------------

export function CompanyListView() {
  const table = useTable();
  const router = useRouter();

  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data, isLoading } = useCompanies();
  const deleteCompany = useDeleteCompany();

  const rows = data?.items ?? [];

  const pagedRows = rows.slice(
    table.page * table.rowsPerPage,
    table.page * table.rowsPerPage + table.rowsPerPage
  );

  const handleDeleteSelected = async () => {
    try {
      await Promise.all(table.selected.map((id) => deleteCompany.mutateAsync(id)));
      toast.success(`${table.selected.length} ta kompaniya o'chirildi`);
      table.onSelectAllRows(false, []);
    } catch {
      toast.error("O'chirishda xato");
    } finally {
      setConfirmDelete(false);
    }
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Kompaniyalar"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Kompaniyalar' },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.company.new}
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            Yangi kompaniya
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        <Box sx={{ position: 'relative' }}>
          <TableSelectedAction
            dense={table.dense}
            rowCount={pagedRows.length}
            numSelected={table.selected.length}
            onSelectAllRows={(checked) =>
              table.onSelectAllRows(checked, pagedRows.map((r) => r.id))
            }
            action={
              <Tooltip title="O'chirish">
                <IconButton color="error" onClick={() => setConfirmDelete(true)}>
                  <Iconify icon="solar:trash-bin-trash-bold" />
                </IconButton>
              </Tooltip>
            }
          />

          <Scrollbar>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 800 }}>
              <TableHeadCustom
                order={table.order}
                orderBy={table.orderBy}
                headCells={TABLE_HEAD}
                rowCount={pagedRows.length}
                numSelected={table.selected.length}
                onSort={table.onSort}
                onSelectAllRows={(checked) =>
                  table.onSelectAllRows(checked, pagedRows.map((r) => r.id))
                }
              />

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedRows.map((row) => (
                    <TableRow key={row.id} hover selected={table.selected.includes(row.id)}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={table.selected.includes(row.id)}
                          onClick={() => table.onSelectRow(row.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ fontWeight: 600 }}>{row.name}</Box>
                        <Box sx={{ color: 'text.secondary', fontSize: 12 }}>
                          {row.id.slice(0, 8)}...
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>
                        {row.description ?? '—'}
                      </TableCell>
                      <TableCell>{row.billing_day ?? '—'}</TableCell>
                      <TableCell>{fDateTime(row.created_at)}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          color="inherit"
                          onClick={() => router.push(paths.dashboard.company.edit(row.id))}
                        >
                          Tahrirlash
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}

                {!isLoading && rows.length === 0 && <TableNoData notFound />}
              </TableBody>
            </Table>
          </Scrollbar>
        </Box>

        <TablePaginationCustom
          page={table.page}
          dense={table.dense}
          count={rows.length}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          onChangeDense={table.onChangeDense}
          onRowsPerPageChange={table.onChangeRowsPerPage}
        />
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="O'chirish"
        content={`${table.selected.length} ta kompaniyani o'chirishni tasdiqlaysizmi?`}
        action={
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteSelected}
            disabled={deleteCompany.isPending}
          >
            {deleteCompany.isPending ? "O'chirilmoqda..." : "O'chirish"}
          </Button>
        }
      />
    </DashboardContent>
  );
}
