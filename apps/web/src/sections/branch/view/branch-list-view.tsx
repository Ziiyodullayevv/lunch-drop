'use client';

import { usePopover } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { fDate, fTime } from 'src/utils/format-time';

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

import { useAuthContext } from 'src/auth/hooks';

import {
  useBranches,
  useDeleteBranch,
  useCompanyBranches,
  useDeleteCompanyBranch,
} from '../hooks/use-branches';

// ----------------------------------------------------------------------

type BranchRow = {
  id: string;
  name: string;
  address: string;
  company_id: string;
  created_at?: string;
  kitchen_ids?: string[];
};

const TABLE_HEAD = [
  { id: 'name', label: 'Filial', width: 620 },
  { id: 'created_at', label: 'Sana', width: 180 },
  { id: 'kitchens', label: 'Oshxonalar', width: 140, align: 'center' as const },
  { id: 'actions', label: '', width: 88 },
];

type RowProps = {
  row: BranchRow;
  selected: boolean;
  canManage: boolean;
  onSelectRow: () => void;
  onDelete: (id: string) => void;
};

function BranchRow({ row, selected, canManage, onSelectRow, onDelete }: RowProps) {
  const router = useRouter();
  const popover = usePopover();
  const kitchenCount = row.kitchen_ids?.length ?? 0;

  return (
    <>
      <TableRow
        hover
        selected={selected}
        sx={{
          '& > *': { borderBottomStyle: 'dashed' },
        }}
      >
        <TableCell padding="checkbox">
          <Checkbox
            checked={selected}
            onClick={onSelectRow}
            slotProps={{ input: { 'aria-label': `${row.name} checkbox` } }}
          />
        </TableCell>

        <TableCell>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Avatar
              variant="rounded"
              sx={{
                width: 48,
                height: 48,
                flexShrink: 0,
                bgcolor: 'primary.lighter',
                color: 'primary.dark',
                fontWeight: 700,
              }}
            >
              {row.name.charAt(0).toUpperCase()}
            </Avatar>

            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" noWrap>
                {row.name}
              </Typography>
              <Typography variant="body2" noWrap sx={{ mt: 0.5, color: 'text.disabled' }}>
                {row.address}
              </Typography>
            </Box>
          </Stack>
        </TableCell>

        <TableCell>
          {row.created_at ? (
            <>
              <Typography variant="body2">{fDate(row.created_at)}</Typography>
              <Typography
                variant="caption"
                sx={{ mt: 0.5, display: 'block', color: 'text.disabled' }}
              >
                {fTime(row.created_at)}
              </Typography>
            </>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              —
            </Typography>
          )}
        </TableCell>

        <TableCell align="center">
          <Typography variant="subtitle2">{kitchenCount}</Typography>
        </TableCell>

        <TableCell align="right">
          {canManage && (
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
          <MenuItem
            onClick={() => {
              popover.onClose();
              router.push(paths.dashboard.branch.details(row.id));
            }}
          >
            <Iconify icon="solar:eye-bold" sx={{ mr: 1 }} />
            Ko&apos;rish
          </MenuItem>
          <MenuItem
            onClick={() => {
              popover.onClose();
              router.push(paths.dashboard.branch.edit(row.id));
            }}
          >
            <Iconify icon="solar:pen-bold" sx={{ mr: 1 }} />
            Tahrirlash
          </MenuItem>
          <MenuItem
            onClick={() => {
              onDelete(row.id);
              popover.onClose();
            }}
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
  const isSuperAdmin = user?.role === 'super_admin';

  const queryParams = { limit: table.rowsPerPage, offset: table.page * table.rowsPerPage };

  // company_admin — /company/branches; super_admin — /super-admin/branches
  const companyQuery = useCompanyBranches(queryParams, isCompanyAdmin);
  const adminQuery = useBranches(queryParams, !isCompanyAdmin);

  const activeQuery = isCompanyAdmin ? companyQuery : adminQuery;
  const branches = activeQuery.data?.items ?? [];
  const total = activeQuery.data?.total ?? 0;
  const isLoading = activeQuery.isLoading;
  const isError = activeQuery.isError;

  const deleteBranch = useDeleteBranch();
  const deleteCompanyBranch = useDeleteCompanyBranch();

  const handleDelete = async (id: string) => {
    try {
      if (isCompanyAdmin) {
        await deleteCompanyBranch.mutateAsync(id);
      } else {
        await deleteBranch.mutateAsync(id);
      }
      toast.success("Filial o'chirildi");
    } catch {
      toast.error('Xatolik yuz berdi');
    }
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Filiallar"
        links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Filiallar' }]}
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

      <Card
        sx={{
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <Scrollbar>
          <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 900 }}>
            <TableHeadCustom
              order={table.order}
              orderBy={table.orderBy}
              headCells={TABLE_HEAD}
              rowCount={branches.length}
              numSelected={table.selected.length}
              onSort={table.onSort}
              onSelectAllRows={(checked) =>
                table.onSelectAllRows(
                  checked,
                  branches.map((row) => row.id)
                )
              }
              sx={{
                '& .MuiTableCell-head': {
                  bgcolor: 'background.neutral',
                  typography: 'subtitle2',
                  color: 'text.primary',
                },
              }}
            />

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : (
                branches.map((row) => (
                  <BranchRow
                    key={row.id}
                    row={row}
                    selected={table.selected.includes(row.id)}
                    canManage={isCompanyAdmin || isSuperAdmin}
                    onSelectRow={() => table.onSelectRow(row.id)}
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
          sx={{
            borderTop: '1px dashed',
            borderColor: 'divider',
          }}
        />
      </Card>
    </DashboardContent>
  );
}
