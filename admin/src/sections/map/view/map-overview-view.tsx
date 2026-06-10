'use client';

import type { MarkerEvent } from 'react-map-gl/maplibre';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import axios, { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { Map, MapPopup, MapMarker, MAP_STYLES, MapControls } from 'src/components/map';

// ----------------------------------------------------------------------

type Kitchen = {
  id: string;
  name: string;
  status: string;
  logo_url: string | null;
  contact_phone: string | null;
  cutoff_time: string;
  latitude: number | null;
  longitude: number | null;
};

type Company = {
  id: string;
  name: string;
  status: string;
  logo_url: string | null;
  contact_phone: string | null;
  latitude: number | null;
  longitude: number | null;
};

type Branch = {
  id: string;
  name: string;
  address: string;
  status: string;
  company_id: string;
  latitude: number | null;
  longitude: number | null;
};

type MarkerItem =
  | { kind: 'kitchen'; data: Kitchen }
  | { kind: 'company'; data: Company }
  | { kind: 'branch'; data: Branch };

const KITCHEN_STATUS_COLOR: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  approved: 'success',
  pending: 'warning',
  suspended: 'error',
  deleted: 'error',
};

const KITCHEN_STATUS_LABEL: Record<string, string> = {
  approved: 'Tasdiqlangan',
  pending: 'Kutilmoqda',
  suspended: "To'xtatilgan",
  deleted: "O'chirilgan",
};

const COMPANY_STATUS_LABEL: Record<string, string> = {
  active: 'Faol',
  pending: 'Kutilmoqda',
  suspended: "To'xtatilgan",
  deleted: "O'chirilgan",
};

const DEFAULT_VIEW = { latitude: 41.2995, longitude: 69.2401, zoom: 11 };

// Colors
const C_KITCHEN = '#FF416D';
const C_COMPANY = '#3B82F6';
const C_BRANCH  = '#10B981';

// ----------------------------------------------------------------------

function KitchenPopupCard({ kitchen }: { kitchen: Kitchen }) {
  return (
    <Stack spacing={1.5} sx={{ p: 0.5, minWidth: 200 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Avatar src={kitchen.logo_url ?? undefined} sx={{ width: 40, height: 40 }}>
          {kitchen.name[0]}
        </Avatar>
        <Box>
          <Typography variant="subtitle2" noWrap sx={{ maxWidth: 150 }}>{kitchen.name}</Typography>
          <Chip
            size="small"
            label={KITCHEN_STATUS_LABEL[kitchen.status] ?? kitchen.status}
            color={KITCHEN_STATUS_COLOR[kitchen.status] ?? 'default'}
            sx={{ height: 20, fontSize: 11 }}
          />
        </Box>
      </Stack>
      <Divider />
      {kitchen.contact_phone && (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Iconify icon="solar:phone-bold" width={14} sx={{ color: 'text.secondary' }} />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{kitchen.contact_phone}</Typography>
        </Stack>
      )}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Iconify icon="solar:clock-circle-bold" width={14} sx={{ color: 'text.secondary' }} />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Buyurtma: {kitchen.cutoff_time} gacha
        </Typography>
      </Stack>
    </Stack>
  );
}

function CompanyPopupCard({ company }: { company: Company }) {
  return (
    <Stack spacing={1.5} sx={{ p: 0.5, minWidth: 200 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Avatar src={company.logo_url ?? undefined} sx={{ width: 40, height: 40, bgcolor: C_COMPANY }}>
          {company.name[0]}
        </Avatar>
        <Box>
          <Typography variant="subtitle2" noWrap sx={{ maxWidth: 150 }}>{company.name}</Typography>
          <Chip
            size="small"
            label={COMPANY_STATUS_LABEL[company.status] ?? company.status}
            color={company.status === 'active' ? 'success' : 'default'}
            sx={{ height: 20, fontSize: 11 }}
          />
        </Box>
      </Stack>
      <Divider />
      {company.contact_phone && (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Iconify icon="solar:phone-bold" width={14} sx={{ color: 'text.secondary' }} />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{company.contact_phone}</Typography>
        </Stack>
      )}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Iconify icon={"solar:buildings-bold" as any} width={14} sx={{ color: 'text.secondary' }} />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>Kompaniya</Typography>
      </Stack>
    </Stack>
  );
}

function BranchPopupCard({ branch, companies }: { branch: Branch; companies: Company[] }) {
  const company = companies.find((c) => c.id === branch.company_id);
  return (
    <Stack spacing={1.5} sx={{ p: 0.5, minWidth: 200 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Avatar sx={{ width: 40, height: 40, bgcolor: C_BRANCH, color: '#fff', fontWeight: 700 }}>
          {branch.name[0]}
        </Avatar>
        <Box>
          <Typography variant="subtitle2" noWrap sx={{ maxWidth: 150 }}>{branch.name}</Typography>
          <Chip
            size="small"
            label={branch.status === 'active' ? 'Faol' : branch.status}
            color={branch.status === 'active' ? 'success' : 'default'}
            sx={{ height: 20, fontSize: 11 }}
          />
        </Box>
      </Stack>
      <Divider />
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Iconify icon={"solar:map-point-bold" as any} width={14} sx={{ color: 'text.secondary' }} />
        <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>{branch.address}</Typography>
      </Stack>
      {company && (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Iconify icon={"solar:buildings-bold" as any} width={14} sx={{ color: 'text.secondary' }} />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{company.name}</Typography>
        </Stack>
      )}
    </Stack>
  );
}

// ----------------------------------------------------------------------

export function MapOverviewView() {
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState<string[]>(['kitchen', 'company', 'branch']);
  const [selected, setSelected] = useState<MarkerItem | null>(null);
  const [popupCoords, setPopupCoords] = useState<{ lat: number; lng: number } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [kitchenRes, companyRes, branchRes] = await Promise.all([
        axios.get(endpoints.superAdmin.kitchens),
        axios.get(endpoints.superAdmin.companies),
        axios.get(endpoints.superAdmin.branches),
      ]);
      setKitchens(kitchenRes.data?.items ?? kitchenRes.data ?? []);
      setCompanies(companyRes.data?.items ?? companyRes.data ?? []);
      setBranches(branchRes.data?.items ?? branchRes.data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleMarkerClick = useCallback(
    (event: MarkerEvent<MouseEvent>, item: MarkerItem, lat: number, lng: number) => {
      event.originalEvent.stopPropagation();
      setSelected(item);
      setPopupCoords({ lat, lng });
    },
    []
  );

  const handleToggleVisible = (key: string) => {
    setVisible((prev) => {
      if (prev.includes(key)) {
        return prev.length > 1 ? prev.filter((v) => v !== key) : prev;
      }
      return [...prev, key];
    });
  };

  const kitchensWithCoords  = kitchens.filter((k) => k.latitude != null && k.longitude != null);
  const companiesWithCoords = companies.filter((c) => c.latitude != null && c.longitude != null);
  const branchesWithCoords  = branches.filter((b) => b.latitude != null && b.longitude != null);
  const totalWithout =
    kitchens.length + companies.length + branches.length
    - kitchensWithCoords.length - companiesWithCoords.length - branchesWithCoords.length;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Xarita"
        links={[{ name: 'Dashboard', href: '/dashboard' }, { name: 'Xarita' }]}
        sx={{ mb: 3 }}
      />

      {/* Stats row */}
      <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
        {[
          { key: 'kitchen', label: 'Oshxonalar',   total: kitchens.length,  coords: kitchensWithCoords.length,  color: C_KITCHEN },
          { key: 'company', label: 'Kompaniyalar', total: companies.length, coords: companiesWithCoords.length, color: C_COMPANY },
          { key: 'branch',  label: 'Filiallar',    total: branches.length,  coords: branchesWithCoords.length,  color: C_BRANCH  },
        ].map((s) => {
          const isActive = visible.includes(s.key);
          return (
            <Card
              key={s.label}
              onClick={() => handleToggleVisible(s.key)}
              sx={{
                px: 2.5, py: 1.5,
                display: 'flex', alignItems: 'center', gap: 1.5,
                flex: '0 0 auto', cursor: 'pointer', userSelect: 'none',
                outline: isActive ? `2px solid ${s.color}` : '2px solid transparent',
                transition: 'outline 0.15s',
              }}
            >
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: s.color, flexShrink: 0 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2">{s.label}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {s.coords} / {s.total} koordinatali
                </Typography>
              </Box>
              <Checkbox
                checked={isActive}
                size="small"
                disableRipple
                sx={{ p: 0, pointerEvents: 'none', color: s.color, '&.Mui-checked': { color: s.color } }}
              />
            </Card>
          );
        })}

        {totalWithout > 0 && (
          <Card sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, flex: '0 0 auto', border: '1px solid', borderColor: 'warning.main' }}>
            <Iconify icon="solar:danger-bold" width={18} sx={{ color: 'warning.main' }} />
            <Typography variant="caption" sx={{ color: 'warning.main' }}>
              {totalWithout} ta yozuvda koordinata yo'q
            </Typography>
          </Card>
        )}
      </Stack>

      {/* Map card */}
      <Card sx={{ position: 'relative' }}>
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 500 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ position: 'relative' }}>
            <Map
              initialViewState={DEFAULT_VIEW}
              mapStyle={MAP_STYLES.light}
              sx={{ height: { xs: 500, md: 680 } }}
              onClick={() => { setSelected(null); setPopupCoords(null); }}
            >
              <MapControls />

              {/* Kitchen markers */}
              {visible.includes('kitchen') &&
                kitchensWithCoords.map((kitchen) => (
                  <MapMarker
                    key={`k-${kitchen.id}`}
                    latitude={kitchen.latitude!}
                    longitude={kitchen.longitude!}
                    onClick={(e) => handleMarkerClick(e, { kind: 'kitchen', data: kitchen }, kitchen.latitude!, kitchen.longitude!)}
                    sx={{ color: C_KITCHEN }}
                  />
                ))}

              {/* Company markers */}
              {visible.includes('company') &&
                companiesWithCoords.map((company) => (
                  <MapMarker
                    key={`c-${company.id}`}
                    latitude={company.latitude!}
                    longitude={company.longitude!}
                    onClick={(e) => handleMarkerClick(e, { kind: 'company', data: company }, company.latitude!, company.longitude!)}
                    sx={{ color: C_COMPANY }}
                  />
                ))}

              {/* Branch markers */}
              {visible.includes('branch') &&
                branchesWithCoords.map((branch) => (
                  <MapMarker
                    key={`b-${branch.id}`}
                    latitude={branch.latitude!}
                    longitude={branch.longitude!}
                    onClick={(e) => handleMarkerClick(e, { kind: 'branch', data: branch }, branch.latitude!, branch.longitude!)}
                    sx={{ color: C_BRANCH }}
                  />
                ))}

              {/* Popup */}
              {selected && popupCoords && (
                <MapPopup
                  latitude={popupCoords.lat}
                  longitude={popupCoords.lng}
                  onClose={() => { setSelected(null); setPopupCoords(null); }}
                  closeOnClick={false}
                >
                  {selected.kind === 'kitchen' && <KitchenPopupCard kitchen={selected.data} />}
                  {selected.kind === 'company' && <CompanyPopupCard company={selected.data} />}
                  {selected.kind === 'branch'  && <BranchPopupCard branch={selected.data} companies={companies} />}
                </MapPopup>
              )}
            </Map>
          </Box>
        )}
      </Card>
    </DashboardContent>
  );
}
