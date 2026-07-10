'use client';

import type { SelectChangeEvent } from '@mui/material/Select';
import type { CompanyKitchenCatalogRead } from 'src/lib/api/companies';

import { useState, useEffect, useCallback } from 'react';
import { useBoolean, usePopover, useDebounce } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import List from '@mui/material/List';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import ListItem from '@mui/material/ListItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import DialogTitle from '@mui/material/DialogTitle';
import ListItemText from '@mui/material/ListItemText';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';
import ListItemButton from '@mui/material/ListItemButton';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { fDateTime } from 'src/utils/format-time';

import { getImagePreviewUrl } from 'src/lib/image-url';
import { DashboardContent } from 'src/layouts/dashboard';
import {
  requestCompanyKitchen,
  disconnectCompanyKitchen,
  fetchCompanyKitchenCatalog,
} from 'src/lib/api/companies';

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
  image_url: string | null;
  order_cutoff_time: string;
  delivery_start_time: string;
  delivery_end_time: string;
  is_active: boolean;
  lat: number;
  lng: number;
  created_at: string;
};

type KitchenCatalog = CompanyKitchenCatalogRead;

type Branch = { id: string; name: string; address?: string | null; company_id?: string };

const CATALOG_TABS = [
  { value: 'all', label: 'Barchasi' },
  { value: 'connected', label: 'Ulangan' },
  { value: 'available', label: 'Mavjud' },
];

const KITCHEN_STATUS_TABS = [
  { value: 'all', label: 'Barchasi' },
  { value: 'active', label: 'Faol' },
  { value: 'inactive', label: 'Nofaol' },
];

const TABLE_HEAD = [
  { id: 'name', label: 'Nomi', width: 500 },
  { id: 'cutoff', label: 'Buyurtma vaqti', width: 150, sx: { whiteSpace: 'nowrap' } },
  { id: 'delivery', label: 'Yetkazish', width: 180 },
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
  const imageUrl = row.image_url ? getImagePreviewUrl(row.image_url) : undefined;

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

        <TableCell sx={{ width: 500, maxWidth: 500 }}>
          <Box
            component={RouterLink}
            href={paths.dashboard.kitchen.details(row.id)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              minWidth: 0,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <Avatar
              alt={row.name}
              src={imageUrl}
              variant="rounded"
              sx={{
                width: 36,
                height: 36,
                flexShrink: 0,
                bgcolor: 'primary.lighter',
                color: 'primary.dark',
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              {row.name.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0, maxWidth: 300 }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                {row.name}
              </Typography>
              <Typography
                variant="caption"
                noWrap
                sx={{ display: 'block', maxWidth: 300, color: 'text.disabled' }}
              >
                {row.phone ?? 'Telefon kiritilmagan'}
              </Typography>
            </Box>
          </Box>
        </TableCell>

        <TableCell>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                display: 'grid',
                flexShrink: 0,
                borderRadius: 1,
                placeItems: 'center',
                color: 'text.secondary',
              }}
            >
              <Iconify icon="solar:clock-circle-outline" width={20} />
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {row.order_cutoff_time?.slice(0, 5) ?? '—'}
            </Typography>
          </Stack>
        </TableCell>

        <TableCell>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                display: 'grid',
                flexShrink: 0,
                borderRadius: 1,
                placeItems: 'center',
                color: 'text.secondary',
              }}
            >
              <Iconify icon="custom:delivery-outline" width={21} />
            </Box>
            <Typography
              variant="body2"
              noWrap
              sx={{ fontWeight: 600, color: 'text.primary', whiteSpace: 'nowrap' }}
            >
              {deliveryWindow}
            </Typography>
          </Stack>
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
          <MenuItem
            onClick={() => {
              popover.onClose();
              router.push(paths.dashboard.kitchen.details(row.id));
            }}
          >
            <Iconify icon="solar:eye-bold" />
            Ko&apos;rish
          </MenuItem>
          <MenuItem
            onClick={() => {
              popover.onClose();
              router.push(paths.dashboard.kitchen.edit(row.id));
            }}
          >
            <Iconify icon="solar:pen-bold" />
            Tahrirlash
          </MenuItem>
          <MenuItem onClick={handleToggleActive}>
            <Iconify
              icon={row.is_active ? 'solar:forbidden-circle-bold' : 'solar:check-circle-bold'}
              sx={{ color: row.is_active ? 'warning.main' : 'success.main' }}
            />
            {row.is_active ? "To'xtatish" : 'Faollashtirish'}
          </MenuItem>
          <MenuItem
            onClick={() => {
              popover.onClose();
              confirmDelete.onTrue();
            }}
            sx={{ color: 'error.main' }}
          >
            <Iconify icon="solar:trash-bin-trash-bold" />
            O&apos;chirish
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
            O&apos;chirish
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
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2.5,
            overflow: 'hidden',
          },
        },
      }}
    >
      <DialogTitle sx={{ px: 3, pt: 3, pb: 2.5 }}>
        <Typography component="div" variant="h4">
          Filiallarni tanlang
        </Typography>
        <Typography variant="body1" sx={{ mt: 1, color: 'text.secondary' }}>
          Oshxonani biriktirish uchun bitta yoki bir nechta filialni tanlang.
        </Typography>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 0, maxHeight: 520 }}>
        <List disablePadding>
          {branches.map((b) => {
            const isChecked = selected.includes(b.id);
            const isAlready = alreadyConnected.includes(b.id);
            return (
              <ListItem key={b.id} disablePadding>
                <ListItemButton
                  onClick={() => !isAlready && toggle(b.id)}
                  disabled={isAlready}
                  selected={isChecked}
                  sx={{
                    px: 3,
                    py: 2.25,
                    gap: 2,
                    minHeight: 88,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    bgcolor: isAlready || isChecked ? 'action.selected' : 'background.paper',
                    opacity: 1,
                    '&.Mui-selected': {
                      bgcolor: 'action.selected',
                      '&:hover': { bgcolor: 'action.selected' },
                    },
                    '&.Mui-disabled': {
                      opacity: 1,
                      color: 'text.primary',
                    },
                    '&:hover': {
                      bgcolor: isAlready || isChecked ? 'action.selected' : 'action.hover',
                    },
                  }}
                >
                  <Checkbox
                    checked={isAlready || isChecked}
                    disabled={isAlready}
                    onChange={() => toggle(b.id)}
                    onClick={(event) => event.stopPropagation()}
                    sx={{
                      p: 0,
                      flexShrink: 0,
                    }}
                  />
                  <ListItemText
                    primary={b.name}
                    secondary={b.address || 'Ulash mumkin'}
                    sx={{ minWidth: 0, flex: '1 1 auto' }}
                    slotProps={{
                      primary: { sx: { typography: 'subtitle1', fontWeight: 700 } },
                      secondary: {
                        sx: {
                          mt: 0.75,
                          typography: 'body2',
                          color: 'text.secondary',
                          display: '-webkit-box',
                          overflow: 'hidden',
                          WebkitBoxOrient: 'vertical',
                          WebkitLineClamp: 2,
                        },
                      },
                    }}
                  />
                  {isAlready && (
                    <Typography variant="subtitle2" sx={{ flexShrink: 0, fontWeight: 700 }}>
                      Biriktirilgan
                    </Typography>
                  )}
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2.5, gap: 1.5, bgcolor: 'background.paper' }}>
        <Button
          fullWidth
          variant="text"
          color="inherit"
          onClick={onClose}
          sx={{ minHeight: 44, borderRadius: 1.5 }}
        >
          Bekor qilish
        </Button>
        <Button
          fullWidth
          variant="contained"
          disabled={selected.length === 0}
          onClick={() => selected.length > 0 && onSelect(selected)}
          sx={{ minHeight: 44, borderRadius: 1.5 }}
        >
          Saqlash
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ----------------------------------------------------------------------

function KitchenCatalogActions({
  kitchen,
  connectedBranches,
  hasAvailableBranches,
  loading,
  onConnect,
  onDisconnect,
}: {
  kitchen: KitchenCatalog;
  connectedBranches: { id: string; name: string }[];
  hasAvailableBranches: boolean;
  loading: boolean;
  onConnect: () => void;
  onDisconnect: (branchId: string) => void;
}) {
  const popover = usePopover();
  const router = useRouter();

  return (
    <>
      <IconButton
        onClick={popover.onOpen}
        sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
      >
        <Iconify icon="eva:more-vertical-fill" />
      </IconButton>

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
              router.push(paths.dashboard.kitchen.details(kitchen.id));
            }}
          >
            <Iconify icon="solar:eye-bold" />
            Ko&apos;rish
          </MenuItem>

          {hasAvailableBranches && (
            <MenuItem
              disabled={loading}
              onClick={() => {
                popover.onClose();
                onConnect();
              }}
            >
              <Iconify icon="mingcute:add-line" />
              Filialga ulash
            </MenuItem>
          )}

          {connectedBranches.length > 0 && <Divider sx={{ borderStyle: 'dashed' }} />}

          {connectedBranches.map((branch) => (
            <MenuItem
              key={branch.id}
              disabled={loading}
              onClick={() => {
                popover.onClose();
                onDisconnect(branch.id);
              }}
              sx={{ color: 'error.main' }}
            >
              <Iconify icon="solar:forbidden-circle-bold" />
              Uzish: {branch.name}
            </MenuItem>
          ))}
        </MenuList>
      </CustomPopover>
    </>
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
  const imageUrl = kitchen.image_url ? getImagePreviewUrl(kitchen.image_url) : undefined;

  const handleConnect = async (branchIds: string[]) => {
    setBranchDialog(false);
    setLoading(true);
    try {
      await Promise.all(
        branchIds.map((branchId) => requestCompanyKitchen(branchId, kitchen.id))
      );
      toast.success("Oshxonaga ulanish so'rovi yuborildi");
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

  const handleDisconnect = async (branchId: string) => {
    setLoading(true);
    try {
      await disconnectCompanyKitchen(branchId, kitchen.id);
      toast.success('Uzildi');
      onRefresh();
    } catch {
      toast.error("Uzib bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  const connectedBranches = kitchen.connected_branch_ids
    .map((id) => ({ id, name: branches.find((branch) => branch.id === id)?.name }))
    .filter((branch): branch is { id: string; name: string } => Boolean(branch.name));
  const pendingBranches = kitchen.pending_branch_ids
    .map((id) => branches.find((branch) => branch.id === id)?.name)
    .filter(Boolean);
  const unavailableBranchIds = new Set([
    ...kitchen.connected_branch_ids,
    ...kitchen.pending_branch_ids,
  ]);
  const hasAvailableBranches = unavailableBranchIds.size < branches.length;
  const infoItems = [
    {
      label: kitchen.phone ?? "Telefon yo'q",
      icon: <Iconify width={16} icon="solar:phone-outline" sx={{ flexShrink: 0 }} />,
    },
    {
      label: kitchen.order_cutoff_time?.slice(0, 5) ?? "Kesim yo'q",
      icon: <Iconify width={16} icon="solar:clock-circle-outline" sx={{ flexShrink: 0 }} />,
    },
    {
      label: deliveryWindow,
      icon: <Iconify width={16} icon="solar:scooter-outline" sx={{ flexShrink: 0 }} />,
    },
    {
      label: connectedBranches.length
        ? connectedBranches.map((branch) => branch.name).join(', ')
        : 'Filialga ulanmagan',
      icon: <Iconify width={16} icon="solar:home-2-outline" sx={{ flexShrink: 0 }} />,
    },
    ...(pendingBranches.length
      ? [{
          label: `Kutilmoqda: ${pendingBranches.join(', ')}`,
          icon: <Iconify width={16} icon="solar:clock-circle-outline" sx={{ flexShrink: 0 }} />,
        }]
      : []),
  ];

  return (
    <>
      <Card
        sx={{
          height: 1,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <KitchenCatalogActions
          kitchen={kitchen}
          connectedBranches={connectedBranches}
          hasAvailableBranches={hasAvailableBranches}
          loading={loading}
          onConnect={handleConnectClick}
          onDisconnect={handleDisconnect}
        />

        <Box
          sx={{
            p: 3,
            pb: 2,
            minHeight: 202,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Avatar
            alt={kitchen.name}
            src={imageUrl}
            variant="rounded"
            sx={{
              width: 48,
              height: 48,
              mb: 2,
              bgcolor: 'primary.lighter',
              color: 'primary.dark',
              fontWeight: 700,
            }}
          >
            {kitchen.name.charAt(0).toUpperCase()}
          </Avatar>

          <ListItemText
            sx={{ mb: 1 }}
            primary={
              <Box
                component={RouterLink}
                href={paths.dashboard.kitchen.details(kitchen.id)}
                sx={{ color: 'inherit', textDecoration: 'none' }}
              >
                {kitchen.name}
              </Box>
            }
            secondary={`Qo'shilgan sana: ${fDateTime(kitchen.created_at)}`}
            slotProps={{
              primary: { sx: { typography: 'subtitle1' } },
              secondary: {
                sx: { mt: 1, typography: 'caption', color: 'text.disabled' },
              },
            }}
          />

          <Box
            sx={{
              gap: 0.5,
              display: 'flex',
              alignItems: 'center',
              color: isConnected ? 'primary.main' : 'text.disabled',
              typography: 'caption',
            }}
          >
            <Iconify width={16} icon="solar:users-group-rounded-outline" />
            {isConnected ? `${connectedBranches.length} ta filial ulangan` : 'Filialga ulanmagan'}
          </Box>
        </Box>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Box
          sx={{
            p: 3,
            rowGap: 1.5,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
          }}
        >
          {infoItems.map((item) => (
            <Box
              key={item.label}
              sx={{
                gap: 0.5,
                minWidth: 0,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                color: 'text.disabled',
              }}
            >
              {item.icon}
              <Typography variant="caption" noWrap>
                {item.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Card>

      <BranchSelectDialog
        open={branchDialog}
        branches={branches}
        alreadyConnected={[...kitchen.connected_branch_ids, ...kitchen.pending_branch_ids]}
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
  const [catalogBranchFilter, setCatalogBranchFilter] = useState('');
  const [catalogSearchText, setCatalogSearchText] = useState('');
  const debouncedCatalogSearch = useDebounce(catalogSearchText, 300).trim().toLowerCase();

  const fetchCatalog = useCallback(async () => {
    try {
      setCatalogLoading(true);
      const result = await fetchCompanyKitchenCatalog();
      setCatalog(result.kitchens);
      setBranches(result.branches);
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
  const [kitchenStatus, setKitchenStatus] = useState('all');
  const [kitchenSearchText, setKitchenSearchText] = useState('');
  const debouncedKitchenSearch = useDebounce(kitchenSearchText, 300).trim().toLowerCase();

  const { data, isLoading, refetch } = useKitchens({ limit: 100 });
  const deleteKitchen = useDeleteKitchen();

  const allKitchens: Kitchen[] = (data?.items ?? []) as Kitchen[];
  const filteredKitchens = allKitchens.filter((kitchen) => {
    if (kitchenStatus === 'active' && !kitchen.is_active) return false;
    if (kitchenStatus === 'inactive' && kitchen.is_active) return false;
    if (!debouncedKitchenSearch) return true;

    const searchableValue = [
      kitchen.id,
      kitchen.name,
      kitchen.description,
      kitchen.phone,
      kitchen.order_cutoff_time,
      kitchen.delivery_start_time,
      kitchen.delivery_end_time,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return debouncedKitchenSearch.split(/\s+/).every((term) => searchableValue.includes(term));
  });

  const pagedRows = filteredKitchens.slice(
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
    const filteredCatalog = catalog.filter((kitchen) => {
      if (catalogTab === 'connected' && kitchen.connected_branch_ids.length === 0) return false;
      if (catalogTab === 'available' && kitchen.connected_branch_ids.length > 0) return false;
      if (catalogBranchFilter && !kitchen.connected_branch_ids.includes(catalogBranchFilter)) {
        return false;
      }
      if (!debouncedCatalogSearch) return true;

      const connectedBranchNames = kitchen.connected_branch_ids
        .map((id) => branches.find((branch) => branch.id === id)?.name)
        .filter(Boolean);
      const searchableValue = [
        kitchen.id,
        kitchen.name,
        kitchen.description,
        kitchen.phone,
        ...connectedBranchNames,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return debouncedCatalogSearch.split(/\s+/).every((term) => searchableValue.includes(term));
    });

    return (
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Oshxonalar"
          links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Oshxonalar' }]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Tabs value={catalogTab} onChange={(_, val) => setCatalogTab(val)}>
          {CATALOG_TABS.map((tab) => (
            <Tab key={tab.value} value={tab.value} label={tab.label} />
          ))}
        </Tabs>

        <Box
          sx={{
            py: 3,
            gap: 2,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
          }}
        >
          <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 240 } }}>
            <InputLabel>Filial</InputLabel>
            <Select
              label="Filial"
              value={catalogBranchFilter}
              onChange={(event: SelectChangeEvent<string>) =>
                setCatalogBranchFilter(event.target.value)
              }
            >
              <MenuItem value="">Barchasi</MenuItem>
              {branches.map((branch) => (
                <MenuItem key={branch.id} value={branch.id}>
                  {branch.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            value={catalogSearchText}
            onChange={(event) => setCatalogSearchText(event.target.value)}
            placeholder="Oshxona, filial, telefon yoki ID bo'yicha..."
            sx={{
              width: {
                xs: 1,
                md: 'min(100%, 720px)',
              },
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
                endAdornment: catalogSearchText ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setCatalogSearchText('')}>
                      <Iconify icon="solar:close-circle-bold" width={16} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
          />
        </Box>

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
        links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Oshxonalar' }]}
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
        <Tabs
          value={kitchenStatus}
          onChange={(_, value) => {
            setKitchenStatus(value);
            table.onResetPage();
          }}
          sx={{ px: 2.5, borderBottom: 1, borderColor: 'divider' }}
        >
          {KITCHEN_STATUS_TABS.map((tab) => {
            const count =
              tab.value === 'active'
                ? allKitchens.filter((kitchen) => kitchen.is_active).length
                : tab.value === 'inactive'
                  ? allKitchens.filter((kitchen) => !kitchen.is_active).length
                  : allKitchens.length;

            return (
              <Tab
                key={tab.value}
                value={tab.value}
                label={tab.label}
                iconPosition="end"
                icon={
                  <Label
                    variant={kitchenStatus === tab.value ? 'filled' : 'soft'}
                    color={tab.value === 'active' ? 'success' : 'default'}
                    sx={{ ml: 0.5 }}
                  >
                    {count}
                  </Label>
                }
              />
            );
          })}
        </Tabs>

        <Box sx={{ p: 2.5 }}>
          <TextField
            value={kitchenSearchText}
            onChange={(event) => {
              setKitchenSearchText(event.target.value);
              table.onResetPage();
            }}
            placeholder="Oshxona nomi, telefon, vaqt yoki ID bo'yicha..."
            sx={{ width: { xs: 1, md: 480 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
                endAdornment: kitchenSearchText ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setKitchenSearchText('');
                        table.onResetPage();
                      }}
                    >
                      <Iconify icon="solar:close-circle-bold" width={16} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
          />
        </Box>

        <Box sx={{ position: 'relative' }}>
          <TableSelectedAction
            dense={table.dense}
            rowCount={pagedRows.length}
            numSelected={table.selected.length}
            onSelectAllRows={(checked) =>
              table.onSelectAllRows(
                checked,
                pagedRows.map((r) => r.id)
              )
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
                  table.onSelectAllRows(
                    checked,
                    pagedRows.map((r) => r.id)
                  )
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

                {!isLoading && filteredKitchens.length === 0 && <TableNoData notFound />}
              </TableBody>
            </Table>
          </Scrollbar>
        </Box>

        <TablePaginationCustom
          page={table.page}
          dense={table.dense}
          count={filteredKitchens.length}
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
            <strong>{table.selected.length} ta</strong> oshxonani o&apos;chirmoqchimisiz?
          </>
        }
        action={
          <Button
            variant="contained"
            color="error"
            onClick={handleBulkDelete}
            disabled={deleteKitchen.isPending}
          >
            O&apos;chirish
          </Button>
        }
      />
    </DashboardContent>
  );
}
