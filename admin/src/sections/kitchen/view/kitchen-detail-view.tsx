'use client';

import type { ViewState, MarkerDragEvent } from 'react-map-gl/maplibre';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import ListItem from '@mui/material/ListItem';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import ListItemText from '@mui/material/ListItemText';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import ListItemButton from '@mui/material/ListItemButton';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';

import { fCurrency } from 'src/utils/format-number';

import axios, { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Map, MapMarker, MapControls } from 'src/components/map';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

const DEFAULT_LAT = 41.2995;
const DEFAULT_LNG = 69.2401;

type Kitchen = {
  id: string;
  name: string;
  description: string | null;
  rating: number;
  status: string;
  cutoff_time: string;
  delivery_start_time: string;
  delivery_end_time: string;
  contact_phone: string | null;
  logo_url?: string | null;
  latitude: number | null;
  longitude: number | null;
};

const WEEK_DAYS = [
  { value: 1, label: 'Du' },
  { value: 2, label: 'Se' },
  { value: 3, label: 'Chor' },
  { value: 4, label: 'Pay' },
  { value: 5, label: 'Ju' },
  { value: 6, label: 'Sha' },
  { value: 7, label: 'Yak' },
];

function getTashkentWeekday(): number {
  const now = new Date();
  const tz = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
  const jsDay = tz.getDay();
  return jsDay === 0 ? 7 : jsDay;
}

type FoodItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  available: boolean;
  available_days: number[];
  is_spicy: boolean;
  is_halal: boolean;
  is_vegetarian: boolean;
  weight_grams: number | null;
  calories: number | null;
};

type Menu = {
  id: string;
  title: string;
  description: string | null;
  food_items: FoodItem[];
};

type Branch = { id: string; name: string };

const statusColor = (s: string) => {
  if (s === 'approved') return 'success';
  if (s === 'suspended') return 'error';
  if (s === 'pending') return 'warning';
  return 'default';
};

// ----------------------------------------------------------------------

function ConnectDialog({
  open,
  branches,
  alreadyConnected,
  onClose,
  onConfirm,
}: {
  open: boolean;
  branches: Branch[];
  alreadyConnected: string[];
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (!open) setSelected([]);
  }, [open]);

  const toggle = (id: string) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>Filialni tanlang</DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        {branches.map((b) => {
          const already = alreadyConnected.includes(b.id);
          const checked = selected.includes(b.id);
          return (
            <ListItem
              key={b.id}
              disablePadding
              secondaryAction={
                <Checkbox
                  edge="end"
                  checked={checked}
                  disabled={already}
                  onChange={() => toggle(b.id)}
                />
              }
            >
              <ListItemButton onClick={() => !already && toggle(b.id)} disabled={already} sx={{ px: 3, py: 1.5 }}>
                <Avatar
                  variant="rounded"
                  sx={{ width: 36, height: 36, mr: 2, bgcolor: 'primary.lighter', color: 'primary.dark', fontSize: 14, fontWeight: 700 }}
                >
                  {b.name.charAt(0).toUpperCase()}
                </Avatar>
                <ListItemText
                  primary={b.name}
                  secondary={already ? 'Allaqachon ulangan' : undefined}
                  slotProps={{
                    primary: { sx: { typography: 'body2', fontWeight: 600 } },
                    secondary: { sx: { typography: 'caption', color: 'success.main' } },
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
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
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={() => onConfirm(selected)}
          sx={{ borderRadius: 1.5 }}
        >
          Ulash{selected.length > 0 ? ` (${selected.length})` : ''}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ----------------------------------------------------------------------

function FoodItemCard({ item }: { item: FoodItem }) {
  return (
    <Card
      sx={{
        p: 2,
        display: 'flex',
        gap: 2,
        alignItems: 'flex-start',
        opacity: item.available ? 1 : 0.5,
      }}
    >
      <Avatar
        src={item.image_url ?? undefined}
        variant="rounded"
        sx={{ width: 56, height: 56, flexShrink: 0, bgcolor: 'background.neutral' }}
      >
        <Iconify icon={"solar:dish-bold" as any} width={24} sx={{ color: 'text.disabled' }} />
      </Avatar>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" noWrap sx={{ mb: 0.25 }}>
          {item.name}
        </Typography>

        {item.description && (
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 0.5 }}>
            {item.description}
          </Typography>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="subtitle2" color="primary.main">
            {fCurrency(item.price, { currency: 'UZS' })}
          </Typography>
          {item.weight_grams && (
            <Typography variant="caption" color="text.disabled">
              {item.weight_grams} g
            </Typography>
          )}
          {item.calories && (
            <Typography variant="caption" color="text.disabled">
              {item.calories} kal
            </Typography>
          )}
        </Box>
      </Box>
    </Card>
  );
}

// ----------------------------------------------------------------------

export function KitchenDetailView({ id }: { id: string }) {
  const { user } = useAuthContext();
  const isCompanyAdmin = user?.role === 'company_admin';
  const isSuperAdmin = user?.role === 'super_admin';

  const [kitchen, setKitchen] = useState<Kitchen | null>(null);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectDialog, setConnectDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [locationMarker, setLocationMarker] = useState({ latitude: DEFAULT_LAT, longitude: DEFAULT_LNG });
  const [locationViewState, setLocationViewState] = useState<Partial<ViewState>>({ latitude: DEFAULT_LAT, longitude: DEFAULT_LNG, zoom: 13 });
  const [hasLocation, setHasLocation] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(getTashkentWeekday());

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [kitchenRes, menuRes] = await Promise.all([
        axios.get(`${endpoints.superAdmin.kitchens}/${id}`),
        axios.get(`${endpoints.superAdmin.kitchens}/${id}/menu`),
      ]);
      setKitchen(kitchenRes.data);
      setMenus(menuRes.data?.menus ?? []);
      if (kitchenRes.data.latitude != null && kitchenRes.data.longitude != null) {
        setLocationMarker({ latitude: kitchenRes.data.latitude, longitude: kitchenRes.data.longitude });
        setLocationViewState({ latitude: kitchenRes.data.latitude, longitude: kitchenRes.data.longitude, zoom: 13 });
        setHasLocation(true);
      }

      if (isCompanyAdmin) {
        const [branchRes, catalogRes] = await Promise.all([
          axios.get(endpoints.superAdmin.branches),
          axios.get(`${endpoints.superAdmin.kitchens}/catalog`),
        ]);
        setBranches(branchRes.data?.items ?? branchRes.data ?? []);
        const entry = (catalogRes.data as Array<{ id: string; connected_branch_ids: string[] }>)
          .find((k) => k.id === id);
        setConnectedIds(entry?.connected_branch_ids ?? []);
      }
    } catch {
      toast.error('Yuklab bo\'lmadi');
    } finally {
      setLoading(false);
    }
  }, [id, isCompanyAdmin]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleConnect = async (branchIds: string[]) => {
    setConnectDialog(false);
    setActionLoading(true);
    try {
      await Promise.all(
        branchIds.map((bid) =>
          axios.post(`${endpoints.superAdmin.kitchens}/${id}/connect`, { branch_id: bid })
        )
      );
      toast.success('Oshxona ulandi');
      fetchAll();
    } catch {
      toast.error("Ulab bo'lmadi");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async (branchId: string) => {
    setActionLoading(true);
    try {
      await axios.delete(`${endpoints.superAdmin.kitchens}/${id}/connect/${branchId}`);
      toast.success('Uzildi');
      fetchAll();
    } catch {
      toast.error("Uzib bo'lmadi");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLocationDragEnd = useCallback((e: MarkerDragEvent) => {
    const { lat, lng } = e.lngLat;
    setLocationMarker({ latitude: lat, longitude: lng });
    setHasLocation(true);
  }, []);

  const handleSaveLocation = async () => {
    setSavingLocation(true);
    try {
      await axios.patch(`${endpoints.superAdmin.kitchens}/${id}`, {
        latitude: locationMarker.latitude,
        longitude: locationMarker.longitude,
      });
      toast.success('Joylashuv saqlandi');
    } catch {
      toast.error("Saqlashda xato");
    } finally {
      setSavingLocation(false);
    }
  };

  if (loading) {
    return (
      <DashboardContent>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  if (!kitchen) return null;

  const isConnected = connectedIds.length > 0;
  const connectedBranchNames = connectedIds
    .map((bid) => branches.find((b) => b.id === bid)?.name)
    .filter(Boolean);

  const allItems = menus.flatMap((m) => m.food_items).length;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={kitchen.name}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Oshxonalar', href: paths.dashboard.kitchen.root },
          { name: kitchen.name },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {/* ── Header ── */}
      <Card sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Avatar
            alt={kitchen.name}
            src={kitchen.logo_url ?? undefined}
            variant="rounded"
            sx={{ width: 80, height: 80, bgcolor: 'primary.lighter', color: 'primary.dark', fontWeight: 700, fontSize: 32 }}
          >
            {kitchen.name.charAt(0).toUpperCase()}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <Typography variant="h5">{kitchen.name}</Typography>
              <Chip
                size="small"
                variant="soft"
                label={kitchen.status}
                color={statusColor(kitchen.status) as any}
              />
            </Box>

            {kitchen.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {kitchen.description}
              </Typography>
            )}

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {[
                { icon: 'solar:star-bold', label: `${Number(kitchen.rating).toFixed(1)} reyting` },
                { icon: 'solar:phone-bold', label: kitchen.contact_phone ?? '—' },
                { icon: 'solar:clock-circle-bold', label: `Cutoff: ${kitchen.cutoff_time?.slice(0, 5)}` },
                { icon: 'solar:delivery-bold', label: `${kitchen.delivery_start_time?.slice(0, 5)} — ${kitchen.delivery_end_time?.slice(0, 5)}` },
                { icon: 'solar:dish-bold', label: `${allItems} taom` },
              ].map((item) => (
                <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.disabled' }}>
                  <Iconify icon={item.icon as any} width={16} />
                  <Typography variant="caption">{item.label}</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Company admin connect/disconnect area */}
          {isCompanyAdmin && (
            <Stack spacing={1} sx={{ alignItems: 'flex-end', minWidth: 160 }}>
              {isConnected ? (
                <>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'flex-end' }}>
                    {connectedBranchNames.map((name, i) => (
                      <Chip
                        key={connectedIds[i]}
                        size="small"
                        variant="soft"
                        color="success"
                        label={name}
                        onDelete={() => handleDisconnect(connectedIds[i])}
                        deleteIcon={<Iconify icon="mingcute:close-line" width={14} />}
                      />
                    ))}
                  </Box>
                  {branches.some((b) => !connectedIds.includes(b.id)) && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Iconify icon="mingcute:add-line" />}
                      onClick={() => setConnectDialog(true)}
                      disabled={actionLoading}
                    >
                      Yana ulash
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  variant="contained"
                  startIcon={<Iconify icon="mingcute:add-line" />}
                  onClick={() => {
                    if (branches.length === 1) {
                      handleConnect([branches[0].id]);
                    } else {
                      setConnectDialog(true);
                    }
                  }}
                  disabled={actionLoading || branches.length === 0}
                >
                  Ulash
                </Button>
              )}
            </Stack>
          )}
        </Box>
      </Card>

      {/* ── Menu ── */}
      {menus.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.disabled' }}>
          <Iconify icon={"solar:dish-bold" as any} width={48} sx={{ mb: 1, opacity: 0.3 }} />
          <Typography variant="h6">Menyu mavjud emas</Typography>
        </Box>
      ) : (
        <Card sx={{ mb: 3 }}>
          {/* Day tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={selectedDay}
              onChange={(_, val) => setSelectedDay(val)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ px: 2 }}
            >
              <Tab value={0} label="Barchasi" sx={{ fontWeight: 600, minWidth: 70 }} />
              {WEEK_DAYS.map((d) => {
                const todayWd = getTashkentWeekday();
                return (
                  <Tab
                    key={d.value}
                    value={d.value}
                    label={d.label}
                    sx={{
                      fontWeight: 600,
                      minWidth: 56,
                      ...(d.value === todayWd && { color: 'primary.main' }),
                    }}
                  />
                );
              })}
            </Tabs>
          </Box>

          <Box sx={{ p: 3 }}>
            <Stack spacing={4}>
              {menus.map((menu) => {
                const visibleItems = selectedDay === 0
                  ? menu.food_items
                  : menu.food_items.filter(
                      (fi) => fi.available_days?.length > 0 && fi.available_days.includes(selectedDay)
                    );

                if (visibleItems.length === 0) return null;

                return (
                  <Box key={menu.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                      <Typography variant="h6">{menu.title}</Typography>
                      <Chip size="small" label={`${visibleItems.length} ta`} variant="soft" />
                    </Box>

                    <Box
                      sx={{
                        display: 'grid',
                        gap: 2,
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
                      }}
                    >
                      {visibleItems.map((item) => (
                        <FoodItemCard key={item.id} item={item} />
                      ))}
                    </Box>
                  </Box>
                );
              })}

              {menus.every((m) =>
                selectedDay === 0
                  ? m.food_items.length === 0
                  : m.food_items.filter(
                      (fi) => fi.available_days?.length > 0 && fi.available_days.includes(selectedDay)
                    ).length === 0
              ) && (
                <Box sx={{ textAlign: 'center', py: 6, color: 'text.disabled' }}>
                  <Iconify icon={"solar:dish-bold" as any} width={40} sx={{ mb: 1, opacity: 0.3 }} />
                  <Typography variant="body2">
                    Bu kun uchun taom belgilanmagan
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>
        </Card>
      )}

      {/* ── Location (super_admin only) ── */}
      {isSuperAdmin && (
        <Card sx={{ p: 3, mt: 3 }}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="h6">Joylashuv</Typography>
              <Typography variant="caption" color="text.secondary">
                Markerni sudrab oshxona manzilini belgilang
              </Typography>
            </Box>
            <LoadingButton
              variant="contained"
              loading={savingLocation}
              disabled={!hasLocation}
              startIcon={<Iconify icon="mingcute:location-fill" />}
              onClick={handleSaveLocation}
            >
              Saqlash
            </LoadingButton>
          </Stack>

          <Map
            {...locationViewState}
            onMove={(evt) => setLocationViewState(evt.viewState)}
            sx={{ height: 340, borderRadius: 2, overflow: 'hidden' }}
          >
            <MapControls />
            <MapMarker
              latitude={locationMarker.latitude}
              longitude={locationMarker.longitude}
              draggable
              anchor="bottom"
              onDragEnd={handleLocationDragEnd}
              sx={{ color: hasLocation ? '#FF416D' : '#9CA3AF' }}
            />
          </Map>

          {hasLocation && (
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Lat: {locationMarker.latitude.toFixed(6)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Lng: {locationMarker.longitude.toFixed(6)}
              </Typography>
            </Stack>
          )}
          {!hasLocation && (
            <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
              Markerni sudrab joylashuvni belgilang
            </Typography>
          )}
        </Card>
      )}

      <ConnectDialog
        open={connectDialog}
        branches={branches}
        alreadyConnected={connectedIds}
        onClose={() => setConnectDialog(false)}
        onConfirm={handleConnect}
      />
    </DashboardContent>
  );
}
