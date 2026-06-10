'use client';

import { useBoolean, usePopover } from 'minimal-shared/hooks';
import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';

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

import type { CompanyKitchenRead } from 'src/lib/api/companies';

import { useAuthContext } from 'src/auth/hooks';


import {
  useBranches,
  useCompanyBranches,
  useCompanyBranchKitchens,
  useCompanyKitchens,
  useAssignCompanyKitchens,
  useUpdateCompanyBranch,
  useDeleteCompanyBranch,
} from '../hooks/use-branches';

// ----------------------------------------------------------------------

type BranchRow = {
  id: string;
  name: string;
  address: string;
  company_id: string;
};

const TABLE_HEAD = [
  { id: 'name',    label: 'Filial'   },
  { id: 'address', label: 'Manzil'  },
  { id: 'actions', label: '',        width: 72 },
];

// ----------------------------------------------------------------------

type EditDialogProps = {
  open: boolean;
  branch: BranchRow | null;
  onClose: () => void;
  onSaved: () => void;
};

function EditBranchDialog({ open, branch, onClose, onSaved }: EditDialogProps) {
  const [name, setName]       = useState(branch?.name ?? '');
  const [address, setAddress] = useState(branch?.address ?? '');
  const updateBranch    = useUpdateCompanyBranch(branch?.id ?? '');
  const assignKitchens  = useAssignCompanyKitchens(branch?.id ?? '');

  const { data: allKitchensData } = useCompanyKitchens();
  const { data: branchKitchens }  = useCompanyBranchKitchens(branch?.id ?? '');

  const allKitchens = allKitchensData ?? [];
  const [selectedKitchenIds, setSelectedKitchenIds] = useState<string[]>([]);

  useEffect(() => {
    if (branchKitchens) {
      setSelectedKitchenIds(branchKitchens.map((k) => k.id));
    }
  }, [branchKitchens]);

  const isPending = updateBranch.isPending || assignKitchens.isPending;

  const handleSave = async () => {
    if (!branch) return;
    try {
      await updateBranch.mutateAsync({ name, address });
      await assignKitchens.mutateAsync(selectedKitchenIds);
      toast.success('Filial yangilandi');
      onSaved();
      onClose();
    } catch {
      toast.error('Xatolik yuz berdi');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Filial tahrirlash</DialogTitle>
      <Divider />
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="Nomi"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
          <TextField
            label="Manzil"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            fullWidth
          />
          <Autocomplete
            multiple
            options={allKitchens}
            getOptionLabel={(o: CompanyKitchenRead) => o.name}
            value={allKitchens.filter((k: CompanyKitchenRead) => selectedKitchenIds.includes(k.id))}
            onChange={(_, value: CompanyKitchenRead[]) => setSelectedKitchenIds(value.map((k) => k.id))}
            disableCloseOnSelect
            isOptionEqualToValue={(option: CompanyKitchenRead, val: CompanyKitchenRead) => option.id === val.id}
            renderOption={(props, option: CompanyKitchenRead, { selected }) => (
              <li {...props} key={option.id}>
                <Checkbox sx={{ mr: 1 }} checked={selected} size="small" />
                {option.name}
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Oshxonalar"
                placeholder="Oshxona tanlang"
                slotProps={{ inputLabel: { shrink: true } }}
              />
            )}
          />
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions>
        <Button onClick={onClose} color="inherit">Bekor qilish</Button>
        <LoadingButton
          variant="contained"
          loading={isPending}
          onClick={handleSave}
          disabled={!name || !address}
        >
          Saqlash
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

// ----------------------------------------------------------------------

type RowProps = {
  row: BranchRow;
  isCompanyAdmin: boolean;
  onEdit: (row: BranchRow) => void;
  onDelete: (id: string) => void;
};

function BranchRow({ row, isCompanyAdmin, onEdit, onDelete }: RowProps) {
  const popover = usePopover();
  return (
    <>
      <TableRow hover>
        <TableCell>
          <Box sx={{ fontWeight: 600 }}>{row.name}</Box>
          <Box sx={{ color: 'text.secondary', fontSize: 12 }}>{row.id.slice(0, 8)}…</Box>
        </TableCell>
        <TableCell sx={{ color: 'text.secondary' }}>{row.address}</TableCell>
        <TableCell align="right">
          {isCompanyAdmin && (
            <IconButton
              size="small"
              color={popover.open ? 'inherit' : 'default'}
              onClick={popover.onOpen}
            >
              <Iconify icon="eva:more-vertical-fill" />
            </IconButton>
          )}
        </TableCell>
      </TableRow>

      <CustomPopover
        open={popover.open}
        anchorEl={popover.anchorEl}
        onClose={popover.onClose}
        slotProps={{ arrow: { placement: 'right-top' } }}
      >
        <MenuList>
          <MenuItem onClick={() => { onEdit(row); popover.onClose(); }}>
            <Iconify icon="solar:pen-bold" sx={{ mr: 1 }} />
            Tahrirlash
          </MenuItem>
          <MenuItem
            onClick={() => { onDelete(row.id); popover.onClose(); }}
            sx={{ color: 'error.main' }}
          >
            <Iconify icon="solar:trash-bin-trash-bold" sx={{ mr: 1 }} />
            O&apos;chirish
          </MenuItem>
        </MenuList>
      </CustomPopover>
    </>
  );
}

// ----------------------------------------------------------------------

export function BranchListView() {
  const table = useTable({ defaultRowsPerPage: 10 });
  const { user } = useAuthContext();
  const isCompanyAdmin = user?.role === 'company_admin';

  const [editTarget, setEditTarget] = useState<BranchRow | null>(null);
  const editDialog = useBoolean();

  const queryParams = { limit: table.rowsPerPage, offset: table.page * table.rowsPerPage };

  // company_admin — /company/branches; super_admin — /super-admin/branches
  const companyQuery = useCompanyBranches(queryParams);
  const adminQuery   = useBranches(queryParams);

  const activeQuery = isCompanyAdmin ? companyQuery : adminQuery;
  const branches    = activeQuery.data?.items ?? [];
  const total       = activeQuery.data?.total ?? 0;
  const isLoading   = activeQuery.isLoading;
  const isError     = activeQuery.isError;

  const deleteBranch = useDeleteCompanyBranch();

  const handleDelete = async (id: string) => {
    try {
      await deleteBranch.mutateAsync(id);
      toast.success("Filial o'chirildi");
    } catch {
      toast.error('Xatolik yuz berdi');
    }
  };

  const handleEdit = (row: BranchRow) => {
    setEditTarget(row);
    editDialog.onTrue();
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Filiallar"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Filiallar' },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.branch.new}
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            Yangi filial
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Filiallarni yuklashda xatolik yuz berdi
        </Alert>
      )}

      <Card>
        <Scrollbar>
          <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 560 }}>
            <TableHeadCustom
              order={table.order}
              orderBy={table.orderBy}
              headCells={TABLE_HEAD}
              rowCount={branches.length}
              numSelected={0}
              onSort={table.onSort}
            />

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 8 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : (
                branches.map((row) => (
                  <BranchRow
                    key={row.id}
                    row={row}
                    isCompanyAdmin={isCompanyAdmin}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))
              )}

              {!isLoading && branches.length === 0 && <TableNoData notFound />}
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

      {isCompanyAdmin && (
        <EditBranchDialog
          open={editDialog.value}
          branch={editTarget}
          onClose={editDialog.onFalse}
          onSaved={() => activeQuery.refetch()}
        />
      )}
    </DashboardContent>
  );
}
