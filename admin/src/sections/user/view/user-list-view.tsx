'use client';

import type { IUserTableFilters } from 'src/types/user';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect, useCallback } from 'react';
import { useBoolean, usePopover, useSetState } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import axios, { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { Form, Field } from 'src/components/hook-form';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomPopover } from 'src/components/custom-popover';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  useTable,
  TableNoData,
  TableHeadCustom,
  TableSelectedAction,
  TablePaginationCustom,
} from 'src/components/table';

import { useAuthContext } from 'src/auth/hooks';

import { UserTableToolbar } from '../user-table-toolbar';
import { UserTableFiltersResult } from '../user-table-filters-result';

// ----------------------------------------------------------------------

type UserItem = {
  id: string;
  phone: string;
  name: string | null;
  role: string;
  status: string;
  company_id: string | null;
  kitchen_id: string | null;
  branch_id: string | null;
  company_name: string | null;
  kitchen_name: string | null;
};

type UserApiResponse = {
  id: string;
  phone: string;
  name: string | null;
  role: string;
  is_active: boolean;
  account_status: string | null;
  company_id: string | null;
  kitchen_id: string | null;
  created_at: string;
};

type PageUserApiResponse = {
  items: UserApiResponse[];
  total: number;
  limit: number;
  offset: number;
};

function mapUser(u: UserApiResponse): UserItem {
  return {
    id: u.id,
    phone: u.phone,
    name: u.name,
    role: u.role,
    status: u.account_status ?? (u.is_active ? 'approved' : 'inactive'),
    company_id: u.company_id,
    kitchen_id: u.kitchen_id,
    branch_id: null,
    company_name: null,
    kitchen_name: null,
  };
}

const ROLES = [
  { value: 'super_admin', label: 'Bosh admin' },
  { value: 'company_admin', label: 'Kompaniya' },
  { value: 'kitchen_admin', label: 'Oshxona' },
  { value: 'employee', label: 'Xodim' },
];

const STATUSES = [
  { value: 'approved', label: 'Faol' },
  { value: 'pending_approval', label: 'Kutmoqda' },
  { value: 'inactive', label: 'Faolsiz' },
  { value: 'rejected', label: 'Rad etilgan' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Barchasi' },
  { value: 'approved', label: 'Faol' },
  { value: 'pending_approval', label: 'Kutmoqda' },
  { value: 'inactive', label: 'Faolsiz' },
  { value: 'rejected', label: 'Rad etilgan' },
];

const TABLE_HEAD = [
  { id: 'name', label: 'Xodim' },
  { id: 'phone', label: 'Telefon', width: 180 },
  { id: 'role', label: 'Rol', width: 140 },
  { id: 'status', label: 'Holat', width: 120 },
  { id: 'actions', label: '', width: 160 },
];

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Bosh admin',
  company_admin: 'Kompaniya',
  kitchen_admin: 'Oshxona',
  employee: 'Xodim',
};

const roleColor = (role: string) => {
  if (role === 'super_admin') return 'error';
  if (role === 'company_admin') return 'primary';
  if (role === 'kitchen_admin') return 'warning';
  return 'default';
};

const STATUS_LABELS: Record<string, string> = {
  approved: 'Faol',
  pending_approval: 'Kutmoqda',
  inactive: 'Faolsiz',
  rejected: 'Rad etilgan',
};

const statusColor = (status: string) => {
  if (status === 'approved') return 'success';
  if (status === 'pending_approval') return 'warning';
  if (status === 'inactive' || status === 'rejected') return 'error';
  return 'default';
};

function avatarInitials(name: string | null, phone: string) {
  if (name) return name.charAt(0).toUpperCase();
  return phone.charAt(phone.length - 1);
}

// ----------------------------------------------------------------------

const EditSchema = z.object({
  name: z.string().optional(),
  phone: z.string().min(1, { message: 'Phone is required' }),
  role: z.string().min(1),
  status: z.string().min(1),
  company_id: z.string().optional(),
  kitchen_id: z.string().optional(),
  branch_id: z.string().optional(),
});

type EditFormValues = z.infer<typeof EditSchema>;
type Company = { id: string; name: string };
type Kitchen = { id: string; name: string };
type Branch = { id: string; name: string };

function EditUserDialog({
  user, open, onClose, onSaved,
}: {
  user: UserItem; open: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    if (!open) return;
    axios.get<Company[]>(endpoints.superAdmin.companies).then((r) => setCompanies(Array.isArray(r.data) ? r.data : (r.data as { items?: Company[] }).items ?? [])).catch(() => {});
    axios.get<Kitchen[]>(endpoints.superAdmin.kitchens).then((r) => setKitchens(Array.isArray(r.data) ? r.data : (r.data as { items?: Kitchen[] }).items ?? [])).catch(() => {});
    axios.get<Branch[]>(endpoints.superAdmin.branches).then((r) => setBranches(Array.isArray(r.data) ? r.data : (r.data as { items?: Branch[] }).items ?? [])).catch(() => {});
  }, [open]);

  const methods = useForm<EditFormValues>({
    resolver: zodResolver(EditSchema),
    values: {
      name: user.name ?? '',
      phone: user.phone,
      role: user.role,
      status: user.status,
      company_id: user.company_id ?? '',
      kitchen_id: user.kitchen_id ?? '',
      branch_id: user.branch_id ?? '',
    },
  });

  const { handleSubmit, watch, formState: { isSubmitting } } = methods;
  const role = watch('role');

  const onSubmit = handleSubmit(async (data) => {
    try {
      await axios.patch(endpoints.superAdmin.user(user.id), {
        name: data.name || null,
        phone: data.phone,
        role: data.role,
        account_status: data.status,
        company_id: data.company_id || null,
        kitchen_id: data.kitchen_id || null,
        branch_id: data.branch_id || null,
      });
      toast.success('User yangilandi');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? 'Xatolik yuz berdi');
    }
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Userni tahrirlash</DialogTitle>
      <Divider />
      <Form methods={methods} onSubmit={onSubmit}>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Field.Text name="name" label="To'liq ism" slotProps={{ inputLabel: { shrink: true } }} />
            <Field.Phone name="phone" label="Telefon" country="UZ" />
            <Field.Select name="role" label="Rol">
              {ROLES.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
            </Field.Select>
            <Field.Select name="status" label="Status">
              {STATUSES.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
            </Field.Select>
            {(role === 'company_admin' || role === 'employee') && (
              <Field.Select name="company_id" label="Kompaniya">
                <MenuItem value="">— None —</MenuItem>
                {companies.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </Field.Select>
            )}
            {role === 'kitchen_admin' && (
              <Field.Select name="kitchen_id" label="Oshxona">
                <MenuItem value="">— None —</MenuItem>
                {kitchens.map((k) => <MenuItem key={k.id} value={k.id}>{k.name}</MenuItem>)}
              </Field.Select>
            )}
            {role === 'employee' && (
              <Field.Select name="branch_id" label="Filial">
                <MenuItem value="">— None —</MenuItem>
                {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
              </Field.Select>
            )}
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions>
          <Button onClick={onClose} color="inherit">Bekor qilish</Button>
          <LoadingButton type="submit" variant="contained" loading={isSubmitting}>Saqlash</LoadingButton>
        </DialogActions>
      </Form>
    </Dialog>
  );
}

// ----------------------------------------------------------------------

function UserRow({
  row, selected, isSelf, onSelectRow, onRefresh,
}: {
  row: UserItem; selected: boolean; isSelf: boolean; onSelectRow: () => void; onRefresh: () => void;
}) {
  const popover = usePopover();
  const editDialog = useBoolean();
  const confirmDialog = useBoolean();

  const handleBlock = async () => {
    popover.onClose();
    try {
      await axios.post(endpoints.superAdmin.blockUser(row.id));
      toast.success('User bloklandi');
      onRefresh();
    } catch { toast.error('Xatolik yuz berdi'); }
  };

  const handleApprove = async () => {
    try {
      await axios.patch(endpoints.superAdmin.approveAdmin(row.id));
      toast.success('Foydalanuvchi tasdiqlandi');
      onRefresh();
    } catch { toast.error('Xatolik yuz berdi'); }
  };

  const handleDelete = async () => {
    confirmDialog.onFalse();
    try {
      await axios.delete(endpoints.superAdmin.user(row.id));
      toast.success("User o'chirildi");
      onRefresh();
    } catch { toast.error('Xatolik yuz berdi'); }
  };

  return (
    <>
      <TableRow hover selected={selected} aria-checked={selected} tabIndex={-1}>
        <TableCell padding="checkbox">
          <Checkbox
            checked={selected}
            onClick={onSelectRow}
            slotProps={{ input: { 'aria-label': `${row.id} checkbox` } }}
          />
        </TableCell>

        <TableCell>
          <Box sx={{ gap: 2, display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ width: 40, height: 40 }}>
              {avatarInitials(row.name, row.phone)}
            </Avatar>
            <Stack sx={{ flex: '1 1 auto', alignItems: 'flex-start' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {row.name ?? '—'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                {row.phone}
              </Typography>
            </Stack>
          </Box>
        </TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>
          {row.phone}
        </TableCell>

        <TableCell>
          <Label variant="soft" color={roleColor(row.role) as any}>
            {ROLE_LABELS[row.role] ?? row.role}
          </Label>
        </TableCell>

        <TableCell>
          <Label variant="soft" color={statusColor(row.status) as any}>
            {STATUS_LABELS[row.status] ?? row.status}
          </Label>
        </TableCell>

        <TableCell align="right">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
            {row.status === 'pending_approval' && (
              <Button size="small" variant="contained" color="success" onClick={handleApprove}>
                Tasdiqlash
              </Button>
            )}
            <IconButton color={popover.open ? 'inherit' : 'default'} onClick={popover.onOpen}>
              <Iconify icon="eva:more-vertical-fill" />
            </IconButton>
          </Box>
        </TableCell>
      </TableRow>

      <CustomPopover
        open={popover.open}
        anchorEl={popover.anchorEl}
        onClose={popover.onClose}
        slotProps={{ arrow: { placement: 'right-top' } }}
      >
        <MenuList>
          <MenuItem onClick={() => { popover.onClose(); editDialog.onTrue(); }}>
            <Iconify icon="solar:pen-bold" />
            Tahrirlash
          </MenuItem>
          {!isSelf && row.status !== 'blocked' && (
            <MenuItem onClick={handleBlock} sx={{ color: 'warning.main' }}>
              <Iconify icon="solar:forbidden-circle-bold" />
              Bloklash
            </MenuItem>
          )}
          {!isSelf && (
            <MenuItem onClick={() => { popover.onClose(); confirmDialog.onTrue(); }} sx={{ color: 'error.main' }}>
              <Iconify icon="solar:trash-bin-trash-bold" />
              O'chirish
            </MenuItem>
          )}
        </MenuList>
      </CustomPopover>

      <EditUserDialog
        user={row}
        open={editDialog.value}
        onClose={editDialog.onFalse}
        onSaved={onRefresh}
      />

      <ConfirmDialog
        open={confirmDialog.value}
        onClose={confirmDialog.onFalse}
        title="O'chirish"
        content="Ushbu foydalanuvchini o'chirmoqchimisiz?"
        action={
          <Button variant="contained" color="error" onClick={handleDelete}>
            O'chirish
          </Button>
        }
      />
    </>
  );
}

// ----------------------------------------------------------------------

function applyFilter(data: UserItem[], filters: IUserTableFilters, tabStatus: string) {
  let result = data;

  if (tabStatus !== 'all') {
    result = result.filter((u) => u.status === tabStatus);
  }
  if (filters.status && filters.status !== 'all') {
    result = result.filter((u) => u.status === filters.status);
  }
  if (filters.role.length) {
    result = result.filter((u) => filters.role.includes(u.role));
  }
  if (filters.name) {
    const q = filters.name.toLowerCase();
    result = result.filter(
      (u) =>
        (u.name ?? '').toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q)
    );
  }
  return result;
}

// ----------------------------------------------------------------------

export function UserListView() {
  const { user: authUser } = useAuthContext();
  const table = useTable({ defaultRowsPerPage: 10 });
  const filters = useSetState<IUserTableFilters>({ name: '', role: [], status: 'all' });
  const bulkConfirm = useBoolean();

  const [allData, setAllData] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabStatus, setTabStatus] = useState('all');

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get<PageUserApiResponse>(endpoints.superAdmin.users, {
        params: { limit: 100, offset: 0 },
      });
      setAllData(res.data.items.map(mapUser));
    } catch {
      toast.error('Foydalanuvchilarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleBulkDelete = async () => {
    try {
      await Promise.all(table.selected.map((id) => axios.delete(endpoints.superAdmin.user(id))));
      toast.success(`${table.selected.length} ta foydalanuvchi o'chirildi`);
      table.onSelectAllRows(false, []);
      fetchUsers();
    } catch {
      toast.error("O'chirishda xatolik yuz berdi");
    }
    bulkConfirm.onFalse();
  };

  const dataFiltered = applyFilter(allData, filters.state, tabStatus);

  const canReset = filters.state.name !== '' || filters.state.role.length > 0;

  const paged = dataFiltered.slice(
    table.page * table.rowsPerPage,
    table.page * table.rowsPerPage + table.rowsPerPage
  );

  const statusCount = (status: string) =>
    status === 'all' ? allData.length : allData.filter((u) => u.status === status).length;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Foydalanuvchilar"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Foydalanuvchilar' },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.user.new}
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            Yangi foydalanuvchi
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        {/* Status tabs */}
        <Tabs
          value={tabStatus}
          onChange={(_, val) => { setTabStatus(val); table.onResetPage(); }}
          sx={{ px: 2.5, borderBottom: 1, borderColor: 'divider' }}
        >
          {STATUS_OPTIONS.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={tab.label}
              iconPosition="end"
              icon={
                <Label
                  variant={tabStatus === tab.value ? 'filled' : 'soft'}
                  color={
                    (tab.value === 'approved' && 'success') ||
                    (tab.value === 'pending_approval' && 'warning') ||
                    (tab.value === 'inactive' && 'error') ||
                    (tab.value === 'rejected' && 'error') ||
                    'default'
                  }
                  sx={{ ml: 0.5 }}
                >
                  {statusCount(tab.value)}
                </Label>
              }
            />
          ))}
        </Tabs>

        {/* Toolbar */}
        <UserTableToolbar
          filters={filters}
          onResetPage={table.onResetPage}
          options={{ roles: ROLES }}
        />

        {/* Active filter chips */}
        {canReset && (
          <UserTableFiltersResult
            filters={filters}
            onResetPage={table.onResetPage}
            totalResults={dataFiltered.length}
            sx={{ p: 2.5, pt: 0 }}
          />
        )}

        {/* Table */}
        <Box sx={{ position: 'relative' }}>
          <TableSelectedAction
            dense={table.dense}
            numSelected={table.selected.length}
            rowCount={dataFiltered.length}
            onSelectAllRows={(checked) =>
              table.onSelectAllRows(checked, dataFiltered.map((r) => r.id))
            }
            action={
              <IconButton color="error" onClick={bulkConfirm.onTrue}>
                <Iconify icon="solar:trash-bin-trash-bold" />
              </IconButton>
            }
          />

          <Scrollbar sx={{ minHeight: 444 }}>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 800 }}>
              <TableHeadCustom
                order={table.order}
                orderBy={table.orderBy}
                headCells={TABLE_HEAD}
                rowCount={dataFiltered.length}
                numSelected={table.selected.length}
                onSort={table.onSort}
                onSelectAllRows={(checked) =>
                  table.onSelectAllRows(checked, dataFiltered.map((r) => r.id))
                }
              />

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map((row) => (
                    <UserRow
                      key={row.id}
                      row={row}
                      selected={table.selected.includes(row.id)}
                      isSelf={row.id === authUser?.id}
                      onSelectRow={() => table.onSelectRow(row.id)}
                      onRefresh={fetchUsers}
                    />
                  ))
                )}

                {!loading && dataFiltered.length === 0 && <TableNoData notFound />}
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
      <ConfirmDialog
        open={bulkConfirm.value}
        onClose={bulkConfirm.onFalse}
        title="O'chirish"
        content={
          <>
            <strong>{table.selected.length} ta</strong> foydalanuvchini o'chirmoqchimisiz?
          </>
        }
        action={
          <Button variant="contained" color="error" onClick={handleBulkDelete}>
            O'chirish
          </Button>
        }
      />
    </DashboardContent>
  );
}
