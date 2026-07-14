'use client';

import type { ReactNode, MouseEvent } from 'react';
import type { SelectChangeEvent } from '@mui/material/Select';
import type { MapRef, MarkerEvent } from 'react-map-gl/maplibre';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import useMediaQuery from '@mui/material/useMediaQuery';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';

import { useTranslate } from 'src/locales';
import axios, { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';
import { fetchCompanyKitchenCatalog } from 'src/lib/api/companies';

import { Iconify } from 'src/components/iconify';
import { CustomPopover } from 'src/components/custom-popover';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { Map, MapPopup, MapMarker, MAP_STYLES, MapControls } from 'src/components/map';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

type UserRole = 'super_admin' | 'company_admin' | 'kitchen_admin';
type EntityType = 'all' | 'branch' | 'kitchen';

type Kitchen = {
  id: string;
  name: string;
  description: string | null;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  order_cutoff_time: string;
  delivery_start_time: string;
  delivery_end_time: string;
  is_active: boolean;
  connected_branch_ids?: string[];
};

type Company = {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  billing_day: number;
};

type CompanyWithBranches = {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  billing_day: number;
  branches: Array<{
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    connected_to_kitchen: boolean;
  }>;
};

type Branch = {
  id: string;
  name: string;
  address: string;
  company_id: string;
  lat: number | null;
  lng: number | null;
  connected_to_kitchen?: boolean;
  connected_kitchen_names?: string[];
};

type MarkerItem =
  | { kind: 'kitchen'; data: Kitchen }
  | { kind: 'branch'; data: Branch };
type PopupAnchor =
  | 'top'
  | 'top-left'
  | 'top-right'
  | 'bottom'
  | 'bottom-left'
  | 'bottom-right'
  | 'left'
  | 'right';

type PageResponse<T> = {
  items: T[];
  total: number;
};

const DEFAULT_VIEW = { latitude: 41.2995, longitude: 69.2401, zoom: 11 };
const PAGE_LIMIT = 100;

const C_KITCHEN = '#FF416D';
const C_BRANCH = '#10B981';
const POPUP_OFFSETS = {
  top: [0, 12] as [number, number],
  'top-left': [12, 12] as [number, number],
  'top-right': [-12, 12] as [number, number],
  bottom: [0, -56] as [number, number],
  'bottom-left': [12, -56] as [number, number],
  'bottom-right': [-12, -56] as [number, number],
  left: [12, 0] as [number, number],
  right: [-12, 0] as [number, number],
  center: [0, 0] as [number, number],
};

// ----------------------------------------------------------------------

async function fetchAllItems<T>(url: string): Promise<T[]> {
  const firstResponse = await axios.get<PageResponse<T>>(url, {
    params: { limit: PAGE_LIMIT, offset: 0 },
  });
  const firstPage = firstResponse.data;
  const remainingPageCount = Math.max(0, Math.ceil(firstPage.total / PAGE_LIMIT) - 1);

  if (remainingPageCount === 0) return firstPage.items;

  const remainingPages = await Promise.all(
    Array.from({ length: remainingPageCount }, (_, index) =>
      axios.get<PageResponse<T>>(url, {
        params: { limit: PAGE_LIMIT, offset: (index + 1) * PAGE_LIMIT },
      })
    )
  );

  return [
    ...firstPage.items,
    ...remainingPages.flatMap((response) => response.data.items),
  ];
}

function MapInfoRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <Stack
      direction="row"
      spacing={1.25}
      sx={{ width: 1, minWidth: 0, maxWidth: 1, alignItems: 'flex-start' }}
    >
      <Box
        sx={{
          mt: 0.1,
          width: 30,
          height: 30,
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 1,
          color: 'text.secondary',
          bgcolor: 'background.neutral',
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0, maxWidth: 'calc(100% - 40px)', flex: 1, overflow: 'hidden' }}>
        <Typography variant="caption" sx={{ display: 'block', mb: 0.15, color: 'text.disabled' }}>
          {label}
        </Typography>
        {children}
      </Box>
    </Stack>
  );
}

function KitchenPopupCard({ kitchen }: { kitchen: Kitchen }) {
  const { t } = useTranslate('common');
  return (
    <Stack spacing={1.75} sx={{ width: 1, minWidth: 0, maxWidth: 1, overflow: 'hidden' }}>
      <Stack direction="row" spacing={1.5} sx={{ pr: 5, minWidth: 0, alignItems: 'center' }}>
        <Avatar sx={{ width: 44, height: 44, bgcolor: C_KITCHEN, fontWeight: 800 }}>
          {kitchen.name[0]}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle1" noWrap sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {kitchen.name}
          </Typography>
          <Chip
            size="small"
            label={kitchen.is_active ? t('map.active') : t('map.inactive')}
            color={kitchen.is_active ? 'success' : 'default'}
            sx={{ height: 20, fontSize: 11 }}
          />
        </Box>
      </Stack>

      <Divider />

      {kitchen.phone && (
        <MapInfoRow icon={<Iconify icon="solar:phone-bold" width={16} />} label={t('map.phone')}>
          <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>
            {kitchen.phone}
          </Typography>
        </MapInfoRow>
      )}

      <MapInfoRow icon={<Iconify icon="solar:clock-circle-bold" width={16} />} label={t('map.orderCutoff')}>
        <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>
          {kitchen.order_cutoff_time} {t('mapExtra.until')}
        </Typography>
      </MapInfoRow>
    </Stack>
  );
}

function BranchPopupCard({
  branch,
  companies,
}: {
  branch: Branch;
  companies: Company[];
}) {
  const { t } = useTranslate('common');
  const company = companies.find((item) => item.id === branch.company_id);
  const connectedKitchenNames = branch.connected_kitchen_names ?? [];
  const connectionLabel = connectedKitchenNames.length
    ? `${connectedKitchenNames.join(', ')} bilan hamkor`
      : branch.connected_to_kitchen
      ? t('map.partnerBranch')
      : t('map.unconnectedBranch');

  return (
    <Stack spacing={1.75} sx={{ width: 1, minWidth: 0, maxWidth: 1, overflow: 'hidden' }}>
      <Stack direction="row" spacing={1.5} sx={{ pr: 5, minWidth: 0, alignItems: 'center' }}>
        <Avatar
          sx={{
            width: 44,
            height: 44,
            bgcolor: C_BRANCH,
            color: '#fff',
            fontWeight: 700,
          }}
        >
          {branch.name[0]}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle1" noWrap sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {branch.name}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {connectionLabel}
          </Typography>
        </Box>
      </Stack>

      <Divider />

      <MapInfoRow icon={<Iconify icon="mingcute:location-fill" width={16} />} label={t('map.address')}>
        <Typography
          variant="body2"
          sx={{
            color: 'text.primary',
            lineHeight: 1.45,
            overflowWrap: 'anywhere',
            display: '-webkit-box',
            overflow: 'hidden',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 3,
          }}
        >
          {branch.address}
        </Typography>
      </MapInfoRow>

      {company && (
        <>
          <MapInfoRow icon={<Iconify icon="solar:home-2-outline" width={16} />} label={t('map.company')}>
            <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }} noWrap>
              {company.name}
            </Typography>
          </MapInfoRow>
          <MapInfoRow icon={<Iconify icon="solar:calendar-date-bold" width={16} />} label={t('map.billingDay')}>
            <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>
              {t('mapExtra.monthlyDay', { day: company.billing_day })}
            </Typography>
          </MapInfoRow>
        </>
      )}

      <Stack
        direction="row"
        spacing={0.75}
        sx={{
          width: 1,
          minWidth: 0,
          maxWidth: 1,
          px: 1.25,
          py: 0.9,
          alignItems: 'center',
          borderRadius: 1,
          color: branch.connected_to_kitchen ? 'success.dark' : 'text.secondary',
          bgcolor: branch.connected_to_kitchen ? 'success.lighter' : 'background.neutral',
        }}
      >
        <Iconify icon={branch.connected_to_kitchen ? 'eva:checkmark-fill' : 'solar:info-circle-bold'} width={16} />
        <Typography
          variant="caption"
          sx={{ minWidth: 0, color: 'inherit', fontWeight: 700, whiteSpace: 'normal' }}
        >
          {branch.connected_to_kitchen
              ? connectedKitchenNames.length
              ? t('map.connectedTo', { names: connectedKitchenNames.join(', ') })
              : t('map.connectedToKitchen')
            : t('map.noPartnership')}
        </Typography>
      </Stack>
    </Stack>
  );
}

// ----------------------------------------------------------------------

export function MapOverviewView() {
  const { t } = useTranslate('common');
  const mapRef = useRef<MapRef | null>(null);
  const companySelectRef = useRef<HTMLDivElement | null>(null);
  const isCompactMap = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const { user } = useAuthContext();
  const role = user?.role as UserRole | undefined;
  const isSuperAdmin = role === 'super_admin';
  const isCompanyAdmin = role === 'company_admin';
  const isKitchenAdmin = role === 'kitchen_admin';

  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [entityType, setEntityType] = useState<EntityType>('all');
  const [companyFilter, setCompanyFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [companySelectOpen, setCompanySelectOpen] = useState(false);
  const [hoveredCompanyId, setHoveredCompanyId] = useState('');
  const [companySubmenuAnchor, setCompanySubmenuAnchor] = useState<HTMLElement | null>(null);
  const [kitchenFilter, setKitchenFilter] = useState('');
  const [selected, setSelected] = useState<MarkerItem | null>(null);
  const [popupCoords, setPopupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [popupAnchor, setPopupAnchor] = useState<PopupAnchor>('bottom');

  const fetchData = useCallback(async () => {
    if (!role) return;

    try {
      setLoading(true);
      setErrorMessage('');

      if (isSuperAdmin) {
        const [companyItems, kitchenItems, branchItems] = await Promise.all([
          fetchAllItems<Company>(endpoints.superAdmin.companies),
          fetchAllItems<Kitchen>(endpoints.superAdmin.kitchens),
          fetchAllItems<Branch>(endpoints.superAdmin.branches),
        ]);

        setCompanies(companyItems);
        setKitchens(kitchenItems);
        setBranches(branchItems);
        return;
      }

      if (isCompanyAdmin) {
        const [companyResponse, catalog] = await Promise.all([
          axios.get<Company>(endpoints.company.me),
          fetchCompanyKitchenCatalog(),
        ]);

        const connectedKitchensByBranch = new globalThis.Map<string, string[]>();
        catalog.kitchens.forEach((kitchen) => {
          kitchen.connected_branch_ids.forEach((branchId) => {
            const kitchenNames = connectedKitchensByBranch.get(branchId) ?? [];
            connectedKitchensByBranch.set(branchId, [...kitchenNames, kitchen.name]);
          });
        });

        setCompanies([companyResponse.data]);
        setBranches(
          catalog.branches.map((branch) => {
            const connectedKitchenNames = connectedKitchensByBranch.get(branch.id) ?? [];
            return {
              ...branch,
              connected_to_kitchen: connectedKitchenNames.length > 0,
              connected_kitchen_names: connectedKitchenNames,
            };
          })
        );
        // Company admins may only see kitchens that have an approved
        // connection to one of their own branches.
        setKitchens(
          catalog.kitchens.filter(
            (kitchen) => kitchen.is_active && kitchen.connected_branch_ids.length > 0
          )
        );
        return;
      }

      if (isKitchenAdmin) {
        const [kitchenResponse, companyResponse] = await Promise.all([
          axios.get<Kitchen>(endpoints.kitchen.me),
          axios.get<CompanyWithBranches[]>(endpoints.kitchen.mapCompanies),
        ]);

        setKitchens([kitchenResponse.data]);
        const companyItems: Company[] = companyResponse.data.map((company) => ({
          id: company.id,
          name: company.name,
          description: company.description,
          logo_url: company.logo_url,
          billing_day: company.billing_day,
        }));
        const branchItems: Branch[] = companyResponse.data.flatMap((company) =>
          company.branches.map((branch) => ({
            ...branch,
            company_id: company.id,
          }))
        );

        setCompanies(companyItems);
        setBranches(branchItems);
      }
    } catch (error) {
      setCompanies([]);
      setBranches([]);
      setKitchens([]);
      setErrorMessage(error instanceof Error ? error.message : "Ma'lumotlarni yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  }, [isCompanyAdmin, isKitchenAdmin, isSuperAdmin, role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const branchOptions = useMemo(
    () =>
      branches.filter(
        (branch) => !companyFilter || branch.company_id === companyFilter
      ),
    [branches, companyFilter]
  );

  const companiesWithBranches = useMemo(
    () => companies.filter((company) => branches.some((branch) => branch.company_id === company.id)),
    [branches, companies]
  );

  const hoveredCompanyBranches = useMemo(
    () => branches.filter((branch) => branch.company_id === hoveredCompanyId),
    [branches, hoveredCompanyId]
  );

  const kitchenOptions = useMemo(() => {
    if (!isCompanyAdmin || !branchFilter) return kitchens;

    return kitchens.filter((kitchen) =>
      kitchen.connected_branch_ids?.includes(branchFilter)
    );
  }, [branchFilter, isCompanyAdmin, kitchens]);

  const branchesWithCoords = useMemo(
    () => branches.filter((branch) => branch.lat != null && branch.lng != null),
    [branches]
  );
  const kitchensWithCoords = useMemo(
    () => kitchens.filter((kitchen) => kitchen.lat != null && kitchen.lng != null),
    [kitchens]
  );

  const filteredBranches = useMemo(
    () =>
      branchesWithCoords.filter((branch) => {
        if (companyFilter && branch.company_id !== companyFilter) return false;
        if (branchFilter && branch.id !== branchFilter) return false;
        return true;
      }),
    [branchFilter, branchesWithCoords, companyFilter]
  );

  const filteredKitchens = useMemo(
    () =>
      kitchensWithCoords.filter((kitchen) => {
        if (kitchenFilter && kitchen.id !== kitchenFilter) return false;
        if (isCompanyAdmin) {
          if (!kitchen.connected_branch_ids?.length) return false;
          if (branchFilter && !kitchen.connected_branch_ids.includes(branchFilter)) return false;
        }
        return true;
      }),
    [branchFilter, isCompanyAdmin, kitchenFilter, kitchensWithCoords]
  );

  const visibleBranches = entityType === 'kitchen' ? [] : filteredBranches;
  const visibleKitchens = entityType === 'branch' ? [] : filteredKitchens;
  const totalWithoutCoords =
    branches.length + kitchens.length - branchesWithCoords.length - kitchensWithCoords.length;
  const visibleMarkerCount = visibleBranches.length + visibleKitchens.length;

  const handleMarkerClick = useCallback(
    (event: MarkerEvent<MouseEvent>, item: MarkerItem, lat: number, lng: number) => {
      event.originalEvent.stopPropagation();
      const map = mapRef.current;
      if (map) {
        const point = map.project([lng, lat]);
        const canvas = map.getCanvas();
        const vertical = point.y < 230 ? 'top' : point.y > canvas.clientHeight - 230 ? 'bottom' : '';
        const horizontal = point.x < 310 ? 'left' : point.x > canvas.clientWidth - 310 ? 'right' : '';
        setPopupAnchor(
          (vertical && horizontal
            ? `${vertical}-${horizontal}`
            : vertical || horizontal || 'bottom') as PopupAnchor
        );
      }
      setSelected(item);
      setPopupCoords({ lat, lng });
    },
    []
  );

  const closeCompanySelect = () => {
    setCompanySelectOpen(false);
    setHoveredCompanyId('');
    setCompanySubmenuAnchor(null);
  };

  const handleCompanySelect = (companyId: string) => {
    setCompanyFilter(companyId);
    setBranchFilter('');
    setSelected(null);
    setPopupCoords(null);
    closeCompanySelect();
  };

  const handleCompanyHover = (event: MouseEvent<HTMLElement>, companyId: string) => {
    setHoveredCompanyId(companyId);
    setCompanySubmenuAnchor(event.currentTarget);
  };

  const handleCompanyBranchSelect = (branch: Branch) => {
    setCompanyFilter(branch.company_id);
    setBranchFilter(branch.id);
    setKitchenFilter('');
    setSelected(null);
    setPopupCoords(null);
    closeCompanySelect();
  };

  const handleBranchChange = (event: SelectChangeEvent<string>) => {
    setBranchFilter(event.target.value);
    setKitchenFilter('');
    setSelected(null);
    setPopupCoords(null);
  };

  const handleKitchenChange = (event: SelectChangeEvent<string>) => {
    setKitchenFilter(event.target.value);
    setSelected(null);
    setPopupCoords(null);
  };

  const handleEntityTypeChange = (event: SelectChangeEvent<EntityType>) => {
    const nextEntityType = event.target.value as EntityType;

    setEntityType(nextEntityType);
    if (nextEntityType === 'branch') setKitchenFilter('');
    if (nextEntityType === 'kitchen' && isSuperAdmin) {
      setCompanyFilter('');
      setBranchFilter('');
    }
    setSelected(null);
    setPopupCoords(null);
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={t('map.title')}
        links={[{ name: t('navigation.dashboard'), href: paths.dashboard.root }, { name: t('map.title') }]}
        sx={{ mb: 3 }}
      />

      <Box
        sx={{
          mb: 2,
          '& .MuiInputLabel-root:not(.MuiInputLabel-shrink)': {
            transform: 'translate(14px, 7px) scale(1)',
          },
          '& .MuiSelect-select': {
            display: 'flex',
            alignItems: 'center',
            minHeight: 'unset',
          },
        }}
      >
        <Stack
          spacing={1.5}
          direction={{ xs: 'column', lg: 'row' }}
          sx={{ alignItems: { xs: 'stretch', lg: 'center' } }}
        >
          <FormControl sx={{ minWidth: { xs: 1, sm: 190 } }}>
            <InputLabel>{t('map.view')}</InputLabel>
            <Select
              size="small"
              label={t('map.view')}
              value={entityType}
              onChange={handleEntityTypeChange}
              sx={{ '& .MuiSelect-select': { display: 'flex', alignItems: 'center' } }}
            >
              <MenuItem value="all">{t('map.all')}</MenuItem>
              <MenuItem value="branch">{t('map.branchesOnly')}</MenuItem>
              <MenuItem value="kitchen">{t('map.kitchensOnly')}</MenuItem>
            </Select>
          </FormControl>

          {(isSuperAdmin || isKitchenAdmin) && entityType !== 'kitchen' && (
            <FormControl sx={{ minWidth: { xs: 1, sm: 220 } }}>
              <Box
                ref={companySelectRef}
                role="button"
                tabIndex={0}
                aria-haspopup="menu"
                aria-expanded={companySelectOpen}
                onClick={() => setCompanySelectOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') setCompanySelectOpen(true);
                }}
                sx={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: 40,
                  px: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  cursor: 'pointer',
                  '&:hover': { borderColor: 'text.primary' },
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ position: 'absolute', top: -9, left: 10, px: 0.5, bgcolor: 'background.paper' }}
                >
                  {t('map.company')}
                </Typography>
                <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                  {companies.find((company) => company.id === companyFilter)?.name ?? t('map.allCompanies')}
                </Typography>
                <Iconify icon="eva:arrow-ios-downward-fill" width={18} sx={{ color: 'text.disabled' }} />
              </Box>
              <CustomPopover
                open={companySelectOpen}
                anchorEl={companySelectRef.current}
                onClose={closeCompanySelect}
                slotProps={{ arrow: { hide: true, placement: 'top-left' }, paper: { sx: { width: 220 } } }}
              >
                <MenuList sx={{ p: 1 }}>
                  <MenuItem sx={{ borderRadius: 1 }} selected={!companyFilter} onClick={() => handleCompanySelect('')}>
                    {t('map.allCompanies')}
                  </MenuItem>
                  {companiesWithBranches.map((company) => (
                    <MenuItem
                      key={company.id}
                      sx={{ borderRadius: 1 }}
                      selected={companyFilter === company.id}
                      onClick={() => handleCompanySelect(company.id)}
                      onMouseEnter={(event) => handleCompanyHover(event, company.id)}
                    >
                      <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                        {company.name}
                      </Typography>
                      <Iconify icon="eva:arrow-ios-forward-fill" width={18} sx={{ ml: 1, color: 'text.disabled' }} />
                    </MenuItem>
                  ))}
                </MenuList>
              </CustomPopover>
              <CustomPopover
                open={Boolean(companySubmenuAnchor) && hoveredCompanyBranches.length > 0}
                anchorEl={companySubmenuAnchor}
                onClose={() => setCompanySubmenuAnchor(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{ arrow: { hide: true, placement: 'top-left' }, paper: { sx: { width: 220 } } }}
              >
                <MenuList sx={{ p: 1 }}>
                  {hoveredCompanyBranches.map((branch) => (
                    <MenuItem
                      key={branch.id}
                      sx={{ borderRadius: 1 }}
                      selected={branchFilter === branch.id}
                      onClick={() => handleCompanyBranchSelect(branch)}
                    >
                      {branch.name}
                    </MenuItem>
                  ))}
                </MenuList>
              </CustomPopover>
            </FormControl>
          )}

          {(isCompanyAdmin || isKitchenAdmin) && (entityType !== 'kitchen' || isCompanyAdmin) && (
            <FormControl sx={{ minWidth: { xs: 1, sm: 220 } }}>
            <InputLabel>{t('map.branch')}</InputLabel>
              <Select size="small" label={t('map.branch')} value={branchFilter} onChange={handleBranchChange} sx={{ '& .MuiSelect-select': { display: 'flex', alignItems: 'center' } }}>
                <MenuItem value="">{t('map.allBranches')}</MenuItem>
                {branchOptions.map((branch) => (
                  <MenuItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {entityType !== 'branch' && (
            <FormControl sx={{ minWidth: { xs: 1, sm: 220 } }}>
            <InputLabel>{t('map.kitchen')}</InputLabel>
              <Select
                size="small"
                label={t('map.kitchen')}
                value={kitchenFilter}
                onChange={handleKitchenChange}
                sx={{ '& .MuiSelect-select': { display: 'flex', alignItems: 'center' } }}
              >
                <MenuItem value="">{t('map.allKitchens')}</MenuItem>
                {kitchenOptions.map((kitchen) => (
                  <MenuItem key={kitchen.id} value={kitchen.id}>
                    {kitchen.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

        </Stack>
      </Box>

      {totalWithoutCoords > 0 && !loading && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('map.missingCoordinates', { count: totalWithoutCoords })}
        </Alert>
      )}

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}

      <Card sx={{ position: 'relative', overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 500 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ position: 'relative' }}>
            <Map
              ref={mapRef}
              initialViewState={DEFAULT_VIEW}
              mapStyle={MAP_STYLES.light}
              sx={{ height: { xs: 500, md: 680 } }}
              onClick={() => {
                setSelected(null);
                setPopupCoords(null);
              }}
            >
              <MapControls />

              {visibleKitchens.map((kitchen) => (
                <MapMarker
                  key={`k-${kitchen.id}`}
                  latitude={kitchen.lat!}
                  longitude={kitchen.lng!}
                  label={kitchen.name}
                  markerColor="#00A76F"
                  active={selected?.kind === 'kitchen' && selected.data.id === kitchen.id}
                  onClick={(event) =>
                    handleMarkerClick(
                      event,
                      { kind: 'kitchen', data: kitchen },
                      kitchen.lat!,
                      kitchen.lng!
                    )
                  }
                  sx={{ color: C_KITCHEN }}
                />
              ))}

              {visibleBranches.map((branch) => (
                <MapMarker
                  key={`b-${branch.id}`}
                  latitude={branch.lat!}
                  longitude={branch.lng!}
                  label={companies.find((company) => company.id === branch.company_id)?.name ?? branch.name}
                  markerColor="#FF5630"
                  active={selected?.kind === 'branch' && selected.data.id === branch.id}
                  onClick={(event) =>
                    handleMarkerClick(
                      event,
                      { kind: 'branch', data: branch },
                      branch.lat!,
                      branch.lng!
                    )
                  }
                  sx={{ color: C_BRANCH }}
                />
              ))}

              {selected && popupCoords && !isCompactMap && (
                <MapPopup
                  latitude={popupCoords.lat}
                  longitude={popupCoords.lng}
                  onClose={() => {
                    setSelected(null);
                    setPopupCoords(null);
                  }}
                  closeOnClick={false}
                  anchor={popupAnchor}
                  offset={POPUP_OFFSETS}
                  maxWidth="320px"
                  sx={{
                    '& .maplibregl-popup-content': {
                      width: 320,
                      maxWidth: 'calc(100vw - 32px)',
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                      p: 2,
                      borderRadius: 1.5,
                      boxShadow: '0 18px 48px rgba(20, 26, 33, 0.18)',
                    },
                    '& .maplibregl-popup-close-button': {
                      top: 8,
                      right: 8,
                      width: 28,
                      height: 28,
                      fontSize: 22,
                      borderRadius: '50%',
                      color: 'text.secondary',
                    },
                  }}
                >
                  {selected.kind === 'kitchen' && (
                    <KitchenPopupCard kitchen={selected.data} />
                  )}
                  {selected.kind === 'branch' && (
                    <BranchPopupCard branch={selected.data} companies={companies} />
                  )}
                </MapPopup>
              )}
            </Map>

            {selected && popupCoords && isCompactMap && (
              <Box
                sx={{
                  position: 'absolute',
                  left: 12,
                  right: 12,
                  bottom: 12,
                  zIndex: 4,
                  p: 2,
                  maxWidth: 'calc(100% - 24px)',
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                  borderRadius: 1.5,
                  bgcolor: 'background.paper',
                  boxShadow: '0 16px 44px rgba(20, 26, 33, 0.22)',
                }}
              >
                <IconButton
                  size="small"
                  onClick={() => {
                    setSelected(null);
                    setPopupCoords(null);
                  }}
                  sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
                >
                  <Iconify icon="mingcute:close-line" />
                </IconButton>
                {selected.kind === 'kitchen' ? (
                  <KitchenPopupCard kitchen={selected.data} />
                ) : (
                  <BranchPopupCard branch={selected.data} companies={companies} />
                )}
              </Box>
            )}

            {visibleMarkerCount === 0 && !errorMessage && (
              <Alert
                severity="info"
                sx={{
                  position: 'absolute',
                  top: 16,
                  left: '50%',
                  zIndex: 1,
                  transform: 'translateX(-50%)',
                  boxShadow: 3,
                }}
              >
                {t('map.noLocations')}
              </Alert>
            )}
          </Box>
        )}
      </Card>
    </DashboardContent>
  );
}
