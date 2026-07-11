'use client';

import type { ReactNode } from 'react';
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
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import useMediaQuery from '@mui/material/useMediaQuery';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';

import axios, { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';
import { fetchCompanyKitchenCatalog } from 'src/lib/api/companies';

import { Iconify } from 'src/components/iconify';
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
            label={kitchen.is_active ? 'Faol' : 'Nofaol'}
            color={kitchen.is_active ? 'success' : 'default'}
            sx={{ height: 20, fontSize: 11 }}
          />
        </Box>
      </Stack>

      <Divider />

      {kitchen.phone && (
        <MapInfoRow icon={<Iconify icon="solar:phone-bold" width={16} />} label="Telefon">
          <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>
            {kitchen.phone}
          </Typography>
        </MapInfoRow>
      )}

      <MapInfoRow icon={<Iconify icon="solar:clock-circle-bold" width={16} />} label="Buyurtma qabul qilish">
        <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>
          {kitchen.order_cutoff_time} gacha
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
  const company = companies.find((item) => item.id === branch.company_id);

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
            {branch.connected_to_kitchen ? 'Hamkor filial' : 'Ulanmagan filial'}
          </Typography>
        </Box>
      </Stack>

      <Divider />

      <MapInfoRow icon={<Iconify icon="mingcute:location-fill" width={16} />} label="Manzil">
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
          <MapInfoRow icon={<Iconify icon="solar:home-2-outline" width={16} />} label="Kompaniya">
            <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }} noWrap>
              {company.name}
            </Typography>
          </MapInfoRow>
          <MapInfoRow icon={<Iconify icon="solar:calendar-date-bold" width={16} />} label="Hisob-kitob kuni">
            <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>
              Har oyning {company.billing_day}-kuni
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
          {branch.connected_to_kitchen ? 'Oshxonaga ulangan' : 'Hamkorlik mavjud emas'}
        </Typography>
      </Stack>
    </Stack>
  );
}

// ----------------------------------------------------------------------

export function MapOverviewView() {
  const mapRef = useRef<MapRef | null>(null);
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

        setCompanies([companyResponse.data]);
        setBranches(catalog.branches);
        setKitchens(catalog.kitchens.filter((kitchen) => kitchen.is_active));
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
        if (
          isCompanyAdmin &&
          branchFilter &&
          !kitchen.connected_branch_ids?.includes(branchFilter)
        ) {
          return false;
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

  const handleCompanyChange = (event: SelectChangeEvent<string>) => {
    setCompanyFilter(event.target.value);
    setBranchFilter('');
    setSelected(null);
    setPopupCoords(null);
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
        heading="Xarita"
        links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Xarita' }]}
        sx={{ mb: 3 }}
      />

      <Card sx={{ p: 2.5, mb: 2 }}>
        <Stack
          spacing={2}
          direction={{ xs: 'column', lg: 'row' }}
          sx={{ alignItems: { xs: 'stretch', lg: 'center' } }}
        >
          <FormControl sx={{ minWidth: { xs: 1, sm: 190 } }}>
            <InputLabel>Ko&apos;rinish</InputLabel>
            <Select
              label="Ko'rinish"
              value={entityType}
              onChange={handleEntityTypeChange}
            >
              <MenuItem value="all">Barchasi</MenuItem>
              <MenuItem value="branch">Faqat filiallar</MenuItem>
              <MenuItem value="kitchen">Faqat oshxonalar</MenuItem>
            </Select>
          </FormControl>

          {(isSuperAdmin || isKitchenAdmin) && entityType !== 'kitchen' && (
            <FormControl sx={{ minWidth: { xs: 1, sm: 220 } }}>
              <InputLabel>Kompaniya</InputLabel>
              <Select
                label="Kompaniya"
                value={companyFilter}
                onChange={handleCompanyChange}
              >
                <MenuItem value="">Barcha kompaniyalar</MenuItem>
                {companies.map((company) => (
                  <MenuItem key={company.id} value={company.id}>
                    {company.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {(entityType !== 'kitchen' || isCompanyAdmin) && (
            <FormControl sx={{ minWidth: { xs: 1, sm: 220 } }}>
              <InputLabel>Filial</InputLabel>
              <Select label="Filial" value={branchFilter} onChange={handleBranchChange}>
                <MenuItem value="">Barcha filiallar</MenuItem>
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
              <InputLabel>Oshxona</InputLabel>
              <Select
                label="Oshxona"
                value={kitchenFilter}
                onChange={handleKitchenChange}
              >
                <MenuItem value="">Barcha oshxonalar</MenuItem>
                {kitchenOptions.map((kitchen) => (
                  <MenuItem key={kitchen.id} value={kitchen.id}>
                    {kitchen.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

        </Stack>
      </Card>

      {totalWithoutCoords > 0 && !loading && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {totalWithoutCoords} ta yozuvda koordinata yo&apos;q
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
                  offset={56}
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
                Tanlangan filtr bo&apos;yicha lokatsiya topilmadi
              </Alert>
            )}
          </Box>
        )}
      </Card>
    </DashboardContent>
  );
}
