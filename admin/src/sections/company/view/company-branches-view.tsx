'use client';

import type { SelectChangeEvent } from '@mui/material/Select';

import { useMemo, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBoolean, usePopover, useDebounce } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
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
import InputLabel from '@mui/material/InputLabel';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import ListItemText from '@mui/material/ListItemText';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDate, fTime } from 'src/utils/format-time';

import { getImagePreviewUrl } from 'src/lib/image-url';
import { DashboardContent } from 'src/layouts/dashboard';
import { fetchBranchesWithKitchenIds } from 'src/lib/api/companies';
import { getRecentBranches, removeRecentBranches } from 'src/lib/recent-branches';

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

import { useKitchens } from 'src/sections/kitchen/hooks/use-kitchens';
import { branchKeys, useAssignKitchens } from 'src/sections/branch/hooks/use-branches';

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
  kitchen_ids?: string[];
};

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'name',       label: 'Kompaniya'                       },
  { id: 'created_at', label: 'Sana',               width: 140 },
  { id: 'branches',   label: 'Filiallar',          width: 90,  align: 'center' as const },
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
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    return next;
  });

  const handleSave = async () => {
    const kitchenIds = Array.from(assigned);
    try {
      const savedKitchens = await assignKitchensMutation.mutateAsync(kitchenIds);
      const savedKitchenIds = savedKitchens.map((kitchen) => kitchen.id);
      toast.success('Oshxonalar saqlandi');
      onSaved(branch.id, savedKitchenIds);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Saqlashda xatolik');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle component="div">
        <Typography component="div" variant="h6">Oshxonalarni biriktirish</Typography>
        <Typography component="div" variant="body2" color="text.secondary">{branch.name}</Typography>
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

// ── CompanyRow ────────────────────────────────────────────────────────────────

type CompanyRowProps = {
  row: Company;
  branches: Branch[];
  selected: boolean;
  newBranchIds: string[];
  onSelectRow: () => void;
  onSuspend: (id: string) => void;
  onDismissNewBranches: (ids: string[]) => void;
  onManageBranch: (b: Branch) => void;
  kitchenAssignMap: Record<string, string[]>;
  kitchenNameById: Map<string, string>;
};

function CompanyRow({
  row,
  branches,
  selected,
  newBranchIds,
  onSelectRow,
  onSuspend,
  onDismissNewBranches,
  onManageBranch,
  kitchenAssignMap,
  kitchenNameById,
}: CompanyRowProps) {
  const collapseRow = useBoolean();
  const menuActions = usePopover();
  const branchMenu = usePopover();
  const [menuBranch, setMenuBranch] = useState<Branch | null>(null);
  const newBranchIdSet = new Set(newBranchIds);

  const handleCollapseToggle = () => {
    if (collapseRow.value && newBranchIds.length > 0) {
      onDismissNewBranches(newBranchIds);
    }
    collapseRow.onToggle();
  };

  const renderPrimaryRow = () => (
    <TableRow hover selected={selected}>
      <TableCell padding="checkbox">
        <Checkbox checked={selected} onClick={onSelectRow} />
      </TableCell>

      <TableCell>
        <Box sx={{ gap: 2, display: 'flex', alignItems: 'center' }}>
          <Avatar
            src={row.logo_url ? getImagePreviewUrl(row.logo_url) : undefined}
            alt={row.name}
            variant="rounded"
            sx={{ width: 40, height: 40, bgcolor: 'primary.lighter', color: 'primary.dark', fontSize: 14, fontWeight: 700 }}
          >
            {row.name[0]}
          </Avatar>
          <ListItemText
            primary={row.name}
            secondary={row.description ?? '—'}
            sx={{ maxWidth: 260, minWidth: 0 }}
            slotProps={{
              primary: { noWrap: true, sx: { typography: 'body2' } },
              secondary: { noWrap: true, sx: { color: 'text.disabled' } },
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
        <Typography variant="body2">{branches.length}</Typography>
      </TableCell>

      <TableCell align="right" sx={{ px: 1, whiteSpace: 'nowrap' }}>
        <IconButton
          color={collapseRow.value ? 'inherit' : 'default'}
          onClick={handleCollapseToggle}
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
      <TableCell sx={{ p: 0, border: 'none' }} colSpan={6}>
        <Collapse in={collapseRow.value} timeout="auto" unmountOnExit sx={{ bgcolor: 'background.neutral' }}>
          <Paper sx={{ m: 1.5 }}>
            {branches.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.disabled">Filiallar mavjud emas</Typography>
              </Box>
            ) : (
              branches.map((b) => {
                const assignedKitchenIds = kitchenAssignMap[b.id] ?? b.kitchen_ids ?? [];
                const assignedKitchenNames = assignedKitchenIds.map(
                  (id) => kitchenNameById.get(id) ?? id
                );

                return (
                  <Box
                    key={b.id}
                    sx={(theme) => ({
                      display: 'grid',
                      gridTemplateColumns: '40px 210px minmax(24px, 1fr) 340px 240px 40px',
                      alignItems: 'flex-start',
                      gap: 2,
                      p: theme.spacing(1.5, 2, 1.5, 1.5),
                      '&:not(:last-of-type)': {
                        borderBottom: `solid 2px ${theme.vars.palette.background.neutral}`,
                      },
                    })}
                  >
                    <Avatar variant="rounded" sx={{ width: 40, height: 40, flexShrink: 0, bgcolor: 'background.neutral', color: 'text.secondary' }}>
                      <Iconify icon="solar:home-2-outline" width={20} />
                    </Avatar>
                    <ListItemText
                      primary={b.name ?? '—'}
                      secondary={row.name}
                      sx={{ width: 210, flex: '0 0 210px', minWidth: 0 }}
                      slotProps={{
                        primary: { sx: { typography: 'body2' } },
                        secondary: { sx: { color: 'text.disabled' } },
                      }}
                    />
                    {newBranchIdSet.has(b.id) && (
                      <Chip
                        label="Yangi"
                        size="small"
                        color="success"
                        variant="soft"
                        sx={{ gridColumn: 3, justifySelf: 'start', fontWeight: 700 }}
                      />
                    )}
                    <Box sx={{ gridColumn: 4, minWidth: 0, width: 340, maxWidth: 340 }}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          overflow: 'hidden',
                          WebkitBoxOrient: 'vertical',
                          WebkitLineClamp: 2,
                          lineHeight: 1.45,
                        }}
                      >
                        {b.address}
                      </Typography>
                    </Box>
                    <Box sx={{ gridColumn: 5, minWidth: 0, width: 240, maxWidth: 240 }}>
                      <Typography
                        variant="caption"
                        sx={{ display: 'block', mb: 0.75, color: 'text.disabled', fontWeight: 600 }}
                      >
                        Tanlangan oshxonalar
                      </Typography>
                      {assignedKitchenNames.length > 0 ? (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                          {assignedKitchenNames.map((name) => (
                            <Chip
                              key={name}
                              label={name}
                              size="small"
                              variant="soft"
                              color="primary"
                            />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.disabled">
                          Oshxona tanlanmagan
                        </Typography>
                      )}
                    </Box>
                    <IconButton
                      size="small"
                      sx={{
                        gridColumn: 6,
                        mt: 0.5,
                        width: 36,
                        height: 36,
                        justifySelf: 'end',
                        borderRadius: '50%',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
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
          O&apos;chirish
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
          <MenuItem
            component={RouterLink}
            href={menuBranch ? paths.dashboard.branch.details(menuBranch.id) : '#'}
            onClick={branchMenu.onClose}
          >
            <Iconify icon="solar:eye-bold" sx={{ mr: 1 }} />
            Ko&apos;rish
          </MenuItem>
          <MenuItem
            component={RouterLink}
            href={menuBranch ? paths.dashboard.branch.edit(menuBranch.id) : '#'}
            onClick={branchMenu.onClose}
          >
            <Iconify icon="solar:pen-bold" sx={{ mr: 1 }} />
            Tahrirlash
          </MenuItem>
        </MenuList>
      </CustomPopover>
    </>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function CompanyBranchesView() {
  const table = useTable({ defaultRowsPerPage: 10 });
  const confirmDelete = useBoolean();
  const queryClient = useQueryClient();

  const [companyFilter, setCompanyFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebounce(searchText, 300).trim().toLowerCase();
  const [manageBranch, setManageBranch] = useState<Branch | null>(null);
  const [recentBranches, setRecentBranches] = useState<ReturnType<typeof getRecentBranches>>([]);
  // Session uchun: qaysi filialga qaysi oshxonalar biriktirilganini yodlaydi
  const [kitchenAssignMap, setKitchenAssignMap] = useState<Record<string, string[]>>({});

  const { data: companiesData, isLoading: loadingCompanies } = useCompanies({ limit: 100 });
  const { data: kitchensData } = useKitchens({ limit: 100 });
  const { data: branchesData, isLoading: loadingBranches } = useQuery({
    queryKey: [...branchKeys.list({ limit: 100 }), 'with-kitchen-ids'],
    queryFn: () => fetchBranchesWithKitchenIds({ limit: 100 }),
  });
  const deleteCompany = useDeleteCompany();

  const companies = useMemo(() => companiesData?.items ?? [], [companiesData]);
  const branches = useMemo(() => branchesData?.items ?? [], [branchesData]);
  const kitchenNameById = useMemo(
    () => new Map((kitchensData?.items ?? []).map((kitchen) => [kitchen.id, kitchen.name])),
    [kitchensData]
  );
  const loading = loadingCompanies || loadingBranches;

  useEffect(() => {
    setRecentBranches(getRecentBranches());
  }, []);

  const branchesByCompany = useMemo(() => {
    const map: Record<string, Branch[]> = {};
    branches.forEach((b) => {
      if (!map[b.company_id]) map[b.company_id] = [];
      map[b.company_id].push(b);
    });
    return map;
  }, [branches]);

  const filtered = useMemo(
    () => companies.filter((company) => {
      if (companyFilter && company.id !== companyFilter) return false;

      if (!debouncedSearch) return true;

      const companyBranches = branchesByCompany[company.id] ?? [];
      const searchableValue = [
        company.id,
        company.name,
        company.description,
        company.billing_day,
        ...companyBranches.flatMap((branch) => [branch.id, branch.name, branch.address]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return debouncedSearch.split(/\s+/).every((term) => searchableValue.includes(term));
    }),
    [companyFilter, companies, debouncedSearch, branchesByCompany]
  );

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

  const handleDeleteSelected = async () => {
    const selectedIds = [...table.selected];
    const results = await Promise.allSettled(
      selectedIds.map((id) => deleteCompany.mutateAsync(id))
    );
    const deletedCount = results.filter((result) => result.status === 'fulfilled').length;
    const failedCount = results.length - deletedCount;

    if (deletedCount > 0) {
      toast.success(`${deletedCount} ta kompaniya o'chirildi`);
    }
    if (failedCount > 0) {
      toast.error(`${failedCount} ta kompaniyani o'chirib bo'lmadi`);
    }

    table.onSelectAllRows(false, []);
    confirmDelete.onFalse();
  };

  const handleDismissNewBranches = (ids: string[]) => {
    removeRecentBranches(ids);
    const idSet = new Set(ids);
    setRecentBranches((current) => current.filter((branch) => !idSet.has(branch.id)));
  };

  const handleKitchenAssignmentSaved = (branchId: string, kitchenIds: string[]) => {
    setKitchenAssignMap((prev) => ({ ...prev, [branchId]: kitchenIds }));
    setManageBranch((current) =>
      current?.id === branchId ? { ...current, kitchen_ids: kitchenIds } : current
    );
    queryClient.setQueriesData<{ items: Branch[] }>(
      { queryKey: branchKeys.all },
      (current) => {
        if (!current?.items) return current;

        return {
          ...current,
          items: current.items.map((branch) =>
            branch.id === branchId ? { ...branch, kitchen_ids: kitchenIds } : branch
          ),
        };
      }
    );
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
        <Box
          sx={{
            p: 2.5,
            gap: 2,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-end', md: 'center' },
          }}
        >
          <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 220 } }}>
            <InputLabel>Kompaniya</InputLabel>
            <Select
              label="Kompaniya"
              value={companyFilter}
              disabled={loadingCompanies}
              onChange={(event: SelectChangeEvent<string>) => {
                setCompanyFilter(event.target.value);
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

          <TextField
            value={searchText}
            onChange={(e) => { setSearchText(e.target.value); table.onResetPage(); }}
            placeholder="Kompaniya, filial, manzil yoki ID bo'yicha..."
            sx={{ width: { xs: 1, md: 560 }, maxWidth: 1 }}
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
          />
        </Box>

        <Box sx={{ position: 'relative' }}>
          <TableSelectedAction
            dense={table.dense}
            rowCount={filtered.length}
            numSelected={table.selected.length}
            onSelectAllRows={(checked) =>
              table.onSelectAllRows(checked, filtered.map((company) => company.id))
            }
            action={
              <Tooltip title="O'chirish">
                <IconButton color="error" onClick={confirmDelete.onTrue}>
                  <Iconify icon="solar:trash-bin-trash-bold" />
                </IconButton>
              </Tooltip>
            }
          />

          <Scrollbar sx={{ minHeight: 480 }}>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 820 }}>
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
                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map((company) => (
                    <CompanyRow
                      key={company.id}
                      row={company}
                    branches={branchesByCompany[company.id] ?? []}
                    newBranchIds={recentBranches
                      .filter((branch) => branch.companyId === company.id)
                      .map((branch) => branch.id)}
                    selected={table.selected.includes(company.id)}
                    onSelectRow={() => table.onSelectRow(company.id)}
                      onSuspend={handleSuspend}
                      onDismissNewBranches={handleDismissNewBranches}
                      onManageBranch={setManageBranch}
                      kitchenAssignMap={kitchenAssignMap}
                      kitchenNameById={kitchenNameById}
                    />
                  ))
                )}
                {!loading && filtered.length === 0 && <TableNoData notFound />}
              </TableBody>
            </Table>
          </Scrollbar>
        </Box>

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
          initialAssigned={kitchenAssignMap[manageBranch.id] ?? manageBranch.kitchen_ids ?? []}
          onSaved={handleKitchenAssignmentSaved}
        />
      )}

      <ConfirmDialog
        open={confirmDelete.value}
        onClose={confirmDelete.onFalse}
        title="Kompaniyalarni o'chirish"
        content={`${table.selected.length} ta kompaniyani o'chirishni tasdiqlaysizmi?`}
        action={
          <LoadingButton
            variant="contained"
            color="error"
            loading={deleteCompany.isPending}
            onClick={handleDeleteSelected}
          >
            O&apos;chirish
          </LoadingButton>
        }
      />
    </DashboardContent>
  );
}
