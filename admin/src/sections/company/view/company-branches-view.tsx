'use client';

import type { Dayjs } from 'dayjs';

import dayjs from 'dayjs';
import { useMemo, useState, useEffect } from 'react';
import { useBoolean, usePopover } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Collapse from '@mui/material/Collapse';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import ListItemText from '@mui/material/ListItemText';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDate, fTime } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomPopover } from 'src/components/custom-popover';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { useTable, TableNoData, TableHeadCustom, TablePaginationCustom } from 'src/components/table';

import { useKitchens } from 'src/sections/kitchen/hooks/use-kitchens';
import { useBranches, useAssignKitchens } from 'src/sections/branch/hooks/use-branches';

import { useCompanies, useDeleteCompany } from '../hooks/use-companies';

// ----------------------------------------------------------------------

type Company = {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  billing_day: number;
  created_at: string;
};

type Branch = {
  id: string;
  name: string;
  address: string;
  company_id: string;
  lat: number;
  lng: number;
  created_at: string;
};

type Kitchen = { id: string; name: string; is_active: boolean };
type KitchenMapping = { id: string; kitchen_id: string; active: boolean; kitchen?: Kitchen };

// ----------------------------------------------------------------------

const UZ_MONTHS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
const UZ_DAYS_FULL = ['Yakshanba','Dushanba','Seshanba','Chorshanba','Payshanba','Juma','Shanba'];

function nextPaymentDate(day: number) {
  const today = dayjs();
  const cur = today.date(day);
  return cur.isAfter(today, 'day') ? cur : today.add(1, 'month').date(day);
}

const companyStatusColor = (s: string): 'success' | 'error' | 'default' =>
  s === 'active' ? 'success' : s === 'suspended' ? 'error' : 'default';

const companyStatusLabel = (s: string) =>
  s === 'active' ? 'Faol' : s === 'suspended' ? 'Bloklangan' : s;

const STATUS_TABS = [
  { value: 'all',       label: 'Barchasi'  },
  { value: 'active',    label: 'Faol'      },
  { value: 'suspended', label: 'Bloklangan'},
];

const TABLE_HEAD = [
  { id: 'name',       label: 'Kompaniya'                       },
  { id: 'created_at', label: 'Sana',               width: 140 },
  { id: 'branches',   label: 'Filiallar',          width: 90  },
  { id: 'billing_day',label: "To'lov kuni",        width: 120 },
  { id: 'actions',    label: '',                   width: 88  },
];

// ── ManageKitchensDialog ──────────────────────────────────────────────────────

function ManageKitchensDialog({
  branch, open, onClose, initialAssigned, onSaved,
}: {
  branch: Branch;
  open: boolean;
  onClose: () => void;
  initialAssigned: string[];
  onSaved: (branchId: string, kitchenIds: string[]) => void;
}) {
  const [assigned, setAssigned] = useState<Set<string>>(new Set(initialAssigned));

  const { data: kitchensData, isLoading: kitchensLoading } = useKitchens();
  const assignKitchensMutation = useAssignKitchens(branch.id);

  const loading = kitchensLoading;
  const allKitchens = kitchensData?.items ?? [];

  // Initialdan qayta ochilganda sync qilish
  useEffect(() => {
    if (open) {
      setAssigned(new Set(initialAssigned));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = (id: string) => setAssigned((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handleSave = async () => {
    const kitchenIds = Array.from(assigned);
    try {
      await assignKitchensMutation.mutateAsync(kitchenIds);
      toast.success('Oshxonalar saqlandi');
      onSaved(branch.id, kitchenIds);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Saqlashda xatolik');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <Typography variant="h6">Oshxonalarni biriktirish</Typography>
        <Typography variant="body2" color="text.secondary">{branch.name}</Typography>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ p: 0 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : allKitchens.length === 0 ? (
          <Box sx={{ px: 3, py: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">Hech qanday oshxona mavjud emas</Typography>
          </Box>
        ) : allKitchens.map((k) => {
          const checked = assigned.has(k.id);
          return (
            <Box key={k.id} onClick={() => toggle(k.id)} sx={{ px: 3, py: 1.5, display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer', borderBottom: '1px solid', borderColor: 'divider', bgcolor: checked ? 'action.selected' : 'transparent', '&:hover': { bgcolor: 'action.hover' } }}>
              <Checkbox checked={checked} size="small" sx={{ p: 0 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{k.name}</Typography>
                <Typography variant="caption" color="text.secondary">{k.is_active ? 'Faol' : 'Nofaol'}</Typography>
              </Box>
              {checked && (
                <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>Biriktirilgan</Typography>
              )}
            </Box>
          );
        })}
      </DialogContent>
      <Divider />
      <DialogActions>
        <Button onClick={onClose} color="inherit">Bekor qilish</Button>
        <LoadingButton variant="contained" loading={assignKitchensMutation.isPending} onClick={handleSave} disabled={loading}>Saqlash</LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

// ── EditBranchDialog ──────────────────────────────────────────────────────────

function EditBranchDialog({ branch, open, onClose, onSaved }: { branch: Branch; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [pickerValue, setPickerValue] = useState<Dayjs>(dayjs());
  const updateBranch = useAssignKitchens(branch.id);

  const selectedDay = pickerValue?.date() ?? null;

  const upcomingDates = selectedDay ? (() => {
    const today = dayjs();
    const first = today.date(selectedDay).isAfter(today, 'day') ? today.date(selectedDay) : today.add(1, 'month').date(selectedDay);
    return [first, first.add(1, 'month').date(selectedDay)];
  })() : [];

  const handleSave = async () => {
    try {
      toast.success('Saqlandi');
      onSaved();
      onClose();
    } catch { toast.error('Xatolik'); }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>
        <Typography variant="h6">Filial sozlamalari</Typography>
        <Typography variant="body2" color="text.secondary">{branch.name}</Typography>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>Har oyning qaysi kunida to'lov amalga oshiriladi</Typography>
          <StaticDatePicker value={pickerValue} onChange={(v) => { if (v) setPickerValue(v); }} views={['day']} slotProps={{ toolbar: { hidden: true }, actionBar: { actions: [] } }} />
        </Box>
        {upcomingDates.length > 0 && (
          <>
            <Divider />
            <Box sx={{ px: 3, py: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Keyingi to'lovlar</Typography>
              <Stack spacing={1} sx={{ mt: 1.5 }}>
                {upcomingDates.map((d, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: i === 0 ? 'primary.main' : 'action.selected', color: i === 0 ? 'primary.contrastText' : 'text.primary', display: 'flex', alignItems: 'center', justifyContent: 'center', typography: 'caption', fontWeight: 700, flexShrink: 0 }}>{d.date()}</Box>
                    <Typography variant="body2">{d.date()}-{UZ_MONTHS[d.month()]}, {d.year()} ({UZ_DAYS_FULL[d.day()]})</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          </>
        )}
      </DialogContent>
      <Divider />
      <DialogActions>
        <Button onClick={onClose} color="inherit">Bekor qilish</Button>
        <LoadingButton variant="contained" loading={updateBranch.isPending} onClick={handleSave}>{selectedDay ? `${selectedDay}-kuni saqlash` : 'Saqlash'}</LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

// ── CompanyRow ────────────────────────────────────────────────────────────────

type CompanyRowProps = {
  row: Company;
  branches: Branch[];
  selected: boolean;
  onSelectRow: () => void;
  onSuspend: (id: string) => void;
  onActivate: (id: string) => void;
  onManageBranch: (b: Branch) => void;
  onEditBranch: (b: Branch) => void;
};

function CompanyRow({ row, branches, selected, onSelectRow, onSuspend, onActivate, onManageBranch, onEditBranch }: CompanyRowProps) {
  const collapseRow = useBoolean();
  const menuActions = usePopover();
  const branchMenu = usePopover();
  const [menuBranch, setMenuBranch] = useState<Branch | null>(null);

  const renderPrimaryRow = () => (
    <TableRow hover selected={selected}>
      <TableCell padding="checkbox">
        <Checkbox checked={selected} onClick={onSelectRow} />
      </TableCell>

      <TableCell>
        <Box sx={{ gap: 2, display: 'flex', alignItems: 'center' }}>
          <Avatar
            src={row.logo_url ?? undefined}
            variant="rounded"
            sx={{ width: 40, height: 40, bgcolor: 'primary.lighter', color: 'primary.dark', fontSize: 14, fontWeight: 700 }}
          >
            {row.name[0]}
          </Avatar>
          <ListItemText
            primary={row.name}
            secondary={row.description ?? '—'}
            slotProps={{
              primary: { sx: { typography: 'body2' } },
              secondary: { sx: { color: 'text.disabled' } },
            }}
          />
        </Box>
      </TableCell>

      <TableCell>
        <ListItemText
          primary={fDate(row.created_at)}
          secondary={fTime(row.created_at)}
          slotProps={{
            primary: { noWrap: true, sx: { typography: 'body2' } },
            secondary: { sx: { mt: 0.5, typography: 'caption' } },
          }}
        />
      </TableCell>

      <TableCell align="center">
        <Typography variant="body2">—</Typography>
      </TableCell>

      <TableCell>
        <Typography variant="body2">{row.billing_day ?? '—'}</Typography>
      </TableCell>

      <TableCell align="right" sx={{ px: 1, whiteSpace: 'nowrap' }}>
        <IconButton
          color={collapseRow.value ? 'inherit' : 'default'}
          onClick={collapseRow.onToggle}
          sx={{ ...(collapseRow.value && { bgcolor: 'action.hover' }) }}
        >
          <Iconify icon="eva:arrow-ios-downward-fill" />
        </IconButton>
        <IconButton color={menuActions.open ? 'inherit' : 'default'} onClick={menuActions.onOpen}>
          <Iconify icon="eva:more-vertical-fill" />
        </IconButton>
      </TableCell>
    </TableRow>
  );

  const renderCollapseRow = () => (
    <TableRow>
      <TableCell sx={{ p: 0, border: 'none' }} colSpan={7}>
        <Collapse in={collapseRow.value} timeout="auto" unmountOnExit sx={{ bgcolor: 'background.neutral' }}>
          <Paper sx={{ m: 1.5 }}>
            {branches.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.disabled">Filiallar mavjud emas</Typography>
              </Box>
            ) : (
              branches.map((b) => {
                const d = null;
                return (
                  <Box
                    key={b.id}
                    sx={(theme) => ({
                      display: 'flex',
                      alignItems: 'center',
                      p: theme.spacing(1.5, 2, 1.5, 1.5),
                      '&:not(:last-of-type)': {
                        borderBottom: `solid 2px ${theme.vars.palette.background.neutral}`,
                      },
                    })}
                  >
                    <Avatar variant="rounded" sx={{ width: 40, height: 40, mr: 2, bgcolor: 'background.neutral', color: 'text.secondary' }}>
                      <Iconify icon="solar:home-2-outline" width={20} />
                    </Avatar>
                    <ListItemText
                      primary={b.name ?? '—'}
                      secondary={b.address ?? '—'}
                      slotProps={{
                        primary: { sx: { typography: 'body2' } },
                        secondary: { sx: { color: 'text.disabled' } },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mr: 2 }}>
                      {b.address}
                    </Typography>
                    <IconButton
                      size="small"
                      color={branchMenu.open && menuBranch?.id === b.id ? 'inherit' : 'default'}
                      onClick={(e) => { setMenuBranch(b); branchMenu.onOpen(e); }}
                    >
                      <Iconify icon="eva:more-vertical-fill" />
                    </IconButton>
                  </Box>
                );
              })
            )}
            <Box sx={(theme) => ({ p: theme.spacing(1, 2), borderTop: `solid 2px ${theme.vars.palette.background.neutral}` })}>
              <Button
                size="small"
                variant="soft"
                color="primary"
                startIcon={<Iconify icon="mingcute:add-line" />}
                component={RouterLink}
                href={`${paths.dashboard.branch.new}?company_id=${row.id}`}
              >
                Yangi filial
              </Button>
            </Box>
          </Paper>
        </Collapse>
      </TableCell>
    </TableRow>
  );

  const renderMenuActions = () => (
    <CustomPopover
      open={menuActions.open}
      anchorEl={menuActions.anchorEl}
      onClose={menuActions.onClose}
      slotProps={{ arrow: { placement: 'right-top' } }}
    >
      <MenuList>
        <li>
          <MenuItem component={RouterLink} href={paths.dashboard.company.edit(row.id)} onClick={menuActions.onClose}>
            <Iconify icon="solar:pen-bold" />
            Tahrirlash
          </MenuItem>
        </li>
        <MenuItem
          onClick={() => { onSuspend(row.id); menuActions.onClose(); }}
          sx={{ color: 'error.main' }}
        >
          <Iconify icon="solar:trash-bin-trash-bold" />
          O'chirish
        </MenuItem>
      </MenuList>
    </CustomPopover>
  );

  return (
    <>
      {renderPrimaryRow()}
      {renderCollapseRow()}
      {renderMenuActions()}

      <CustomPopover
        open={branchMenu.open}
        anchorEl={branchMenu.anchorEl}
        onClose={branchMenu.onClose}
        slotProps={{ arrow: { placement: 'right-top' } }}
      >
        <MenuList>
          <MenuItem onClick={() => { if (menuBranch) onManageBranch(menuBranch); branchMenu.onClose(); }}>
            <Iconify icon="solar:cup-star-bold" sx={{ mr: 1 }} />
            Oshxonalar
          </MenuItem>
          <MenuItem onClick={() => { if (menuBranch) onEditBranch(menuBranch); branchMenu.onClose(); }}>
            <Iconify icon="solar:settings-bold" sx={{ mr: 1 }} />
            Sozlash
          </MenuItem>
        </MenuList>
      </CustomPopover>
    </>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function CompanyBranchesView() {
  const table = useTable({ defaultRowsPerPage: 10 });

  const [tabStatus, setTabStatus] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [manageBranch, setManageBranch] = useState<Branch | null>(null);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  // Session uchun: qaysi filialga qaysi oshxonalar biriktirilganini yodlaydi
  const [kitchenAssignMap, setKitchenAssignMap] = useState<Record<string, string[]>>({});

  const { data: companiesData, isLoading: loadingCompanies } = useCompanies();
  const { data: branchesData, isLoading: loadingBranches } = useBranches();
  const deleteCompany = useDeleteCompany();

  const companies = companiesData?.items ?? [];
  const branches = branchesData?.items ?? [];
  const loading = loadingCompanies || loadingBranches;

  const branchesByCompany = useMemo(() => {
    const map: Record<string, Branch[]> = {};
    branches.forEach((b) => {
      if (!map[b.company_id]) map[b.company_id] = [];
      map[b.company_id].push(b);
    });
    return map;
  }, [branches]);

  const tabCounts = useMemo(() => ({
    all: companies.length,
  }), [companies]);

  const filtered = useMemo(() => {
    if (!searchText) return companies;
    const q = searchText.toLowerCase();
    return companies.filter((c) => c.name.toLowerCase().includes(q));
  }, [companies, searchText]);

  const paged = filtered.slice(
    table.page * table.rowsPerPage,
    table.page * table.rowsPerPage + table.rowsPerPage
  );

  const handleSuspend = async (id: string) => {
    try {
      await deleteCompany.mutateAsync(id);
      toast.success("Kompaniya o'chirildi");
    } catch { toast.error('Xatolik'); }
  };

  const handleActivate = (_id: string) => {
    toast.info("Bu funksiya hali qo'shilmagan");
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Kompaniyalar va Filiallar"
        links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Kompaniyalar' }]}
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
        <Tabs
          value={tabStatus}
          onChange={(_, val) => { setTabStatus(val); table.onResetPage(); }}
          sx={{ px: 2.5, borderBottom: 1, borderColor: 'divider' }}
        >
          {STATUS_TABS.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={tab.label}
              iconPosition="end"
              icon={
                <Label
                  variant={tabStatus === tab.value ? 'filled' : 'soft'}
                  color={tab.value === 'active' ? 'success' : tab.value === 'suspended' ? 'error' : 'default'}
                  sx={{ ml: 0.5 }}
                >
                  {tabCounts[tab.value as keyof typeof tabCounts]}
                </Label>
              }
            />
          ))}
        </Tabs>

        <Box sx={{ p: 2.5 }}>
          <TextField
            fullWidth
            value={searchText}
            onChange={(e) => { setSearchText(e.target.value); table.onResetPage(); }}
            placeholder="Kompaniya nomi yoki telefon raqami..."
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
                endAdornment: searchText ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchText('')}>
                      <Iconify icon="solar:close-circle-bold" width={16} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
          />
        </Box>

        <Scrollbar sx={{ minHeight: 480 }}>
          <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 900 }}>
            <TableHeadCustom
              order={table.order}
              orderBy={table.orderBy}
              headCells={TABLE_HEAD}
              rowCount={filtered.length}
              numSelected={table.selected.length}
              onSort={table.onSort}
              onSelectAllRows={(checked) =>
                table.onSelectAllRows(checked, filtered.map((c) => c.id))
              }
            />
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((company) => (
                  <CompanyRow
                    key={company.id}
                    row={company}
                    branches={branchesByCompany[company.id] ?? []}
                    selected={table.selected.includes(company.id)}
                    onSelectRow={() => table.onSelectRow(company.id)}
                    onSuspend={handleSuspend}
                    onActivate={handleActivate}
                    onManageBranch={setManageBranch}
                    onEditBranch={setEditBranch}
                  />
                ))
              )}
              {!loading && filtered.length === 0 && <TableNoData notFound />}
            </TableBody>
          </Table>
        </Scrollbar>

        <TablePaginationCustom
          page={table.page}
          dense={table.dense}
          count={filtered.length}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          onChangeDense={table.onChangeDense}
          onRowsPerPageChange={table.onChangeRowsPerPage}
        />
      </Card>

      {manageBranch && (
        <ManageKitchensDialog
          branch={manageBranch}
          open={Boolean(manageBranch)}
          onClose={() => setManageBranch(null)}
          initialAssigned={kitchenAssignMap[manageBranch.id] ?? []}
          onSaved={(branchId, kitchenIds) =>
            setKitchenAssignMap((prev) => ({ ...prev, [branchId]: kitchenIds }))
          }
        />
      )}

      {editBranch && (
        <EditBranchDialog
          branch={editBranch}
          open={Boolean(editBranch)}
          onClose={() => setEditBranch(null)}
          onSaved={() => {}}
        />
      )}
    </DashboardContent>
  );
}
