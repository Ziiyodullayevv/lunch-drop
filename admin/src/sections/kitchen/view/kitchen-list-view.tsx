'use client';

import { useBoolean, usePopover } from 'minimal-shared/hooks';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import Tabs from '@mui/material/Tabs';
import Table from '@mui/material/Table';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import ListItem from '@mui/material/ListItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import ListItemText from '@mui/material/ListItemText';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import ListItemButton from '@mui/material/ListItemButton';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { fDateTime } from 'src/utils/format-time';

import axios, { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
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

import { useKitchens, useDeleteKitchen, useUpdateKitchen } from '../hooks/use-kitchens';

// ----------------------------------------------------------------------

type Kitchen = {
  id: string;
  name: string;
  description: string | null;
  phone: string | null;
  order_cutoff_time: string;
  delivery_start_time: string;
  delivery_end_time: string;
  is_active: boolean;
  lat: number;
  lng: number;
  created_at: string;
};

type KitchenCatalog = Kitchen & {
  connected_branch_ids: string[];
};

type Branch = { id: string; name: string };

const CATALOG_TABS = [
  { value: 'all', label: 'Barchasi' },
  { value: 'connected', label: 'Ulangan' },
  { value: 'available', label: 'Mavjud' },
];

const TABLE_HEAD = [
  { id: 'name', label: 'Nomi' },
  { id: 'phone', label: 'Telefon', width: 150 },
  { id: 'cutoff', label: 'Kesim vaqti', width: 130 },
  { id: 'delivery', label: 'Yetkazish', width: 150 },
  { id: 'status', label: 'Status', width: 110 },
  { id: 'created_at', label: 'Yaratildi', width: 160 },
  { id: 'actions', label: '', width: 100 },
];

// ----------------------------------------------------------------------

function KitchenTableRow({
  row,
  selected,
  onSelectRow,
  onRefresh,
}: {
  row: Kitchen;
  selected: boolean;
  onSelectRow: () => void;
  onRefresh: () => void;
}) {
  const router = useRouter();
  const popover = usePopover();
  const confirmDelete = useBoolean();
  const deleteKitchen = useDeleteKitchen();
  const updateKitchen = useUpdateKitchen(row.id);

  const deliveryWindow = `${row.delivery_start_time?.slice(0, 5)} — ${row.delivery_end_time?.slice(0, 5)}`;

  const handleToggleActive = async () => {
    popover.onClose();
    try {
      await updateKitchen.mutateAsync({ is_active: !row.is_active });
      toast.success(row.is_active ? 'Nofaol qilindi' : 'Faol qilindi');
      onRefresh();
    } catch {
      toast.error('Xatolik yuz berdi');
    }
  };

  const handleDelete = async () => {
    confirmDelete.onFalse();
    try {
      await deleteKitchen.mutateAsync(row.id);
      toast.success("Oshxona o'chirildi");
      onRefresh();
    } catch {
      toast.error("O'chirishda xatolik");
    }
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
          <Box
            component={RouterLink}
            href={paths.dashboard.kitchen.details(row.id)}
            sx={{ display: 'flex', alignItems: 'center', gap: 2, textDecoration: 'none', color: 'inherit' }}
          >
            <Avatar
              variant="rounded"
              sx={{ width: 36, height: 36, bgcolor: 'primary.lighter', color: 'primary.dark', fontWeight: 700, fontSize: 15 }}
            >
              {row.name.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.name}</Typography>
              {row.description && (
                <Typography variant="caption" sx={{ color: 'text.disabled' }} noWrap>
                  {row.description}
                </Typography>
              )}
            </Box>
          </Box>
        </TableCell>

        <TableCell sx={{ color: 'text.secondary' }}>{row.phone ?? '—'}</TableCell>

        <TableCell sx={{ color: 'text.secondary' }}>
          {row.order_cutoff_time?.slice(0, 5) ?? '—'}
        </TableCell>

        <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
          {deliveryWindow}
        </TableCell>

        <TableCell>
          <Label variant="soft" color={row.is_active ? 'success' : 'default'}>
            {row.is_active ? 'Faol' : 'Nofaol'}
          </Label>
        </TableCell>

        <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
          {fDateTime(row.created_at)}
        </TableCell>

        <TableCell align="right">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <IconButton onClick={() => router.push(paths.dashboard.kitchen.details(row.id))}>
              <Iconify icon="solar:pen-bold" />
            </IconButton>
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
          <MenuItem onClick={handleToggleActive}>
            <Iconify
              icon={row.is_active ? 'solar:forbidden-circle-bold' : 'solar:check-circle-bold'}
              sx={{ color: row.is_active ? 'warning.main' : 'success.main' }}
            />
            {row.is_active ? "To'xtatish" : 'Faollashtirish'}
          </MenuItem>
          <MenuItem onClick={() => { popover.onClose(); confirmDelete.onTrue(); }} sx={{ color: 'error.main' }}>
            <Iconify icon="solar:trash-bin-trash-bold" />
            O'chirish
          </MenuItem>
        </MenuList>
      </CustomPopover>

      <ConfirmDialog
        open={confirmDelete.value}
        onClose={confirmDelete.onFalse}
        title="O'chirish"
        content="Ushbu oshxonani o'chirmoqchimisiz?"
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

function BranchSelectDialog({
  open,
  branches,
  alreadyConnected,
  onClose,
  onSelect,
}: {
  open: boolean;
  branches: Branch[];
  alreadyConnected: string[];
  onClose: () => void;
  onSelect: (branchIds: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (!open) setSelected([]);
  }, [open]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>Filialni tanlang</DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <List disablePadding>
          {branches.map((b) => {
            const isChecked = selected.includes(b.id);
            const isAlready = alreadyConnected.includes(b.id);
            return (
              <ListItem
                key={b.id}
                disablePadding
                secondaryAction={
                  <Checkbox
                    edge="end"
                    checked={isChecked}
                    disabled={isAlready}
                    onChange={() => toggle(b.id)}
                    sx={{ color: 'primary.main' }}
                  />
                }
              >
                <ListItemButton
                  onClick={() => !isAlready && toggle(b.id)}
                  disabled={isAlready}
                  sx={{ px: 3, py: 1.5 }}
                >
                  <Avatar
                    variant="rounded"
                    sx={{ width: 36, height: 36, mr: 2, bgcolor: 'primary.lighter', color: 'primary.dark', fontSize: 14, fontWeight: 700 }}
                  >
                    {b.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <ListItemText
                    primary={b.name}
                    secondary={isAlready ? 'Allaqachon ulangan' : undefined}
                    slotProps={{
                      primary: { sx: { typography: 'body2', fontWeight: 600 } },
                      secondary: { sx: { typography: 'caption', color: 'success.main' } },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button fullWidth variant="outlined" color="inherit" onClick={onClose} sx={{ borderRadius: 1.5 }}>
          Bekor qilish
        </Button>
        <Button
          fullWidth
          variant="contained"
          disabled={selected.length === 0}
          onClick={() => selected.length > 0 && onSelect(selected)}
          startIcon={<Iconify icon="mingcute:add-line" />}
          sx={{ borderRadius: 1.5 }}
        >
          Ulash{selected.length > 0 ? ` (${selected.length})` : ''}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ----------------------------------------------------------------------

function CatalogKitchenItem({
  kitchen,
  branches,
  onRefresh,
}: {
  kitchen: KitchenCatalog;
  branches: Branch[];
  onRefresh: () => void;
}) {
  const [branchDialog, setBranchDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const deliveryWindow = `${kitchen.delivery_start_time?.slice(0, 5)} — ${kitchen.delivery_end_time?.slice(0, 5)}`;
  const isConnected = kitchen.connected_branch_ids.length > 0;

  const handleConnect = async (branchIds: string[]) => {
    setBranchDialog(false);
    setLoading(true);
    try {
      await Promise.all(
        branchIds.map((branchId) =>
          axios.post(endpoints.superAdmin.assignKitchens(branchId), { kitchen_ids: [kitchen.id] })
        )
      );
      toast.success('Oshxona ulandi');
      onRefresh();
    } catch {
      toast.error("Ulab bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  const handleConnectClick = () => {
    if (branches.length === 1 && !kitchen.connected_branch_ids.includes(branches[0].id)) {
      handleConnect([branches[0].id]);
    } else {
      setBranchDialog(true);
    }
  };

  const handleDisconnect = async (_branchId: string) => {
    setLoading(true);
    try {
      await axios.patch(endpoints.superAdmin.kitchen(kitchen.id), { is_active: false });
      toast.success('Uzildi');
      onRefresh();
    } catch {
      toast.error("Uzib bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  const connectedBranchNames = kitchen.connected_branch_ids
    .map((id) => branches.find((b) => b.id === id)?.name)
    .filter(Boolean);

  return (
    <>
      <Card sx={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <Box
          component={RouterLink}
          href={paths.dashboard.kitchen.details(kitchen.id)}
          sx={{ textDecoration: 'none', color: 'inherit', display: 'block', p: 3, pb: 2, '&:hover': { bgcolor: 'action.hover' } }}
        >
          <Avatar
            alt={kitchen.name}
            variant="rounded"
            sx={{ width: 48, height: 48, mb: 2, bgcolor: 'primary.lighter', color: 'primary.dark', fontWeight: 700 }}
          >
            {kitchen.name.charAt(0).toUpperCase()}
          </Avatar>

          <ListItemText
            sx={{ mb: 1 }}
            primary={kitchen.name}
            secondary={kitchen.description ?? "Tavsif yo'q"}
            slotProps={{
              primary: { sx: { typography: 'subtitle1' } },
              secondary: { sx: { mt: 0.5, typography: 'caption', color: 'text.disabled' } },
            }}
          />
        </Box>

        <Box sx={{ px: 3, pb: 2 }}>
          {isConnected ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {connectedBranchNames.map((name, i) => (
                <Chip
                  key={kitchen.connected_branch_ids[i]}
                  size="small"
                  variant="soft"
                  color="success"
                  label={name}
                  onDelete={() => handleDisconnect(kitchen.connected_branch_ids[i])}
                  deleteIcon={<Iconify icon="mingcute:close-line" width={14} />}
                />
              ))}
            </Box>
          ) : (
            <Chip size="small" variant="soft" color="default" label="Ulanmagan" />
          )}
        </Box>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Box sx={{ p: 3, pt: 2, rowGap: 1.5, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)' }}>
          {[
            {
              label: kitchen.is_active ? 'Faol' : 'Nofaol',
              icon: <Iconify width={16} icon={'solar:star-bold' as any} sx={{ flexShrink: 0 }} />,
            },
            {
              label: kitchen.phone ?? '—',
              icon: <Iconify width={16} icon="solar:phone-bold" sx={{ flexShrink: 0 }} />,
            },
            {
              label: `Kesim: ${kitchen.order_cutoff_time?.slice(0, 5) ?? '—'}`,
              icon: <Iconify width={16} icon="solar:clock-circle-bold" sx={{ flexShrink: 0 }} />,
            },
            {
              label: deliveryWindow,
              icon: <Iconify width={16} icon={'solar:scooter-bold' as any} sx={{ flexShrink: 0 }} />,
            },
          ].map((item) => (
            <Box key={item.label} sx={{ gap: 0.5, minWidth: 0, display: 'flex', alignItems: 'center', color: 'text.disabled' }}>
              {item.icon}
              <Typography variant="caption" noWrap>{item.label}</Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ px: 3, pb: 3, mt: 'auto' }}>
          {isConnected ? (
            <Button
              fullWidth size="small" variant="soft" color="success"
              startIcon={<Iconify icon="solar:check-circle-bold" />}
              onClick={handleConnectClick}
              disabled={loading}
            >
              Yana ulash
            </Button>
          ) : (
            <Button
              fullWidth size="small" variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={handleConnectClick}
              disabled={loading || branches.length === 0}
            >
              Ulash
            </Button>
          )}
        </Box>
      </Card>

      <BranchSelectDialog
        open={branchDialog}
        branches={branches}
        alreadyConnected={kitchen.connected_branch_ids}
        onClose={() => setBranchDialog(false)}
        onSelect={handleConnect}
      />
    </>
  );
}

// ----------------------------------------------------------------------

export function KitchenListView() {
  const { user } = useAuthContext();
  const isCompanyAdmin = user?.role === 'company_admin';

  // ── Company admin catalog state ──────────────────────────────────────
  const [catalog, setCatalog] = useState<KitchenCatalog[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogTab, setCatalogTab] = useState('all');

  const fetchCatalog = useCallback(async () => {
    try {
      setCatalogLoading(true);
      const [catRes, branchRes] = await Promise.all([
        axios.get(endpoints.company.kitchens).catch(() => ({ data: [] })),
        axios.get(endpoints.company.branches).catch(() => ({ data: [] })),
      ]);
      setCatalog(catRes.data?.items ?? catRes.data ?? []);
      setBranches(branchRes.data?.items ?? branchRes.data ?? []);
    } catch {
      setCatalog([]);
      setBranches([]);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isCompanyAdmin) fetchCatalog();
  }, [isCompanyAdmin, fetchCatalog]);

  // ── Super admin table state ──────────────────────────────────────────
  const table = useTable({ defaultRowsPerPage: 10 });
  const confirmBulkDelete = useBoolean();

  const { data, isLoading, refetch } = useKitchens({ limit: 100 });
  const deleteKitchen = useDeleteKitchen();

  const allKitchens: Kitchen[] = (data?.items ?? []) as Kitchen[];

  const pagedRows = allKitchens.slice(
    table.page * table.rowsPerPage,
    table.page * table.rowsPerPage + table.rowsPerPage
  );

  const handleBulkDelete = async () => {
    try {
      await Promise.all(table.selected.map((id) => deleteKitchen.mutateAsync(id)));
      toast.success(`${table.selected.length} ta oshxona o'chirildi`);
      table.onSelectAllRows(false, []);
      refetch();
    } catch {
      toast.error("O'chirishda xatolik yuz berdi");
    }
    confirmBulkDelete.onFalse();
  };

  // ── Company admin catalog view ───────────────────────────────────────
  if (isCompanyAdmin) {
    const filteredCatalog =
      catalogTab === 'connected'
        ? catalog.filter((k) => k.connected_branch_ids.length > 0)
        : catalogTab === 'available'
          ? catalog.filter((k) => k.connected_branch_ids.length === 0)
          : catalog;

    return (
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Oshxonalar"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Oshxonalar' },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Tabs value={catalogTab} onChange={(_, val) => setCatalogTab(val)} sx={{ mb: 3 }}>
          {CATALOG_TABS.map((tab) => (
            <Tab key={tab.value} value={tab.value} label={tab.label} />
          ))}
        </Tabs>

        {catalogLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : filteredCatalog.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, color: 'text.disabled' }}>
            <Typography variant="h6">Oshxonalar topilmadi</Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            }}
          >
            {filteredCatalog.map((kitchen) => (
              <CatalogKitchenItem
                key={kitchen.id}
                kitchen={kitchen}
                branches={branches}
                onRefresh={fetchCatalog}
              />
            ))}
          </Box>
        )}
      </DashboardContent>
    );
  }

  // ── Super admin table view ───────────────────────────────────────────
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Oshxonalar"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Oshxonalar' },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.kitchen.new}
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            Yangi oshxona
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
                <IconButton color="error" onClick={confirmBulkDelete.onTrue}>
                  <Iconify icon="solar:trash-bin-trash-bold" />
                </IconButton>
              </Tooltip>
            }
          />

          <Scrollbar>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 900 }}>
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
                    <TableCell colSpan={8} align="center" sx={{ py: 5 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedRows.map((row) => (
                    <KitchenTableRow
                      key={row.id}
                      row={row}
                      selected={table.selected.includes(row.id)}
                      onSelectRow={() => table.onSelectRow(row.id)}
                      onRefresh={() => refetch()}
                    />
                  ))
                )}

                {!isLoading && allKitchens.length === 0 && <TableNoData notFound />}
              </TableBody>
            </Table>
          </Scrollbar>
        </Box>

        <TablePaginationCustom
          page={table.page}
          dense={table.dense}
          count={allKitchens.length}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          onChangeDense={table.onChangeDense}
          onRowsPerPageChange={table.onChangeRowsPerPage}
        />
      </Card>

      <ConfirmDialog
        open={confirmBulkDelete.value}
        onClose={confirmBulkDelete.onFalse}
        title="O'chirish"
        content={
          <>
            <strong>{table.selected.length} ta</strong> oshxonani o'chirmoqchimisiz?
          </>
        }
        action={
          <Button variant="contained" color="error" onClick={handleBulkDelete} disabled={deleteKitchen.isPending}>
            O'chirish
          </Button>
        }
      />
    </DashboardContent>
  );
}
