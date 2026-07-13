'use client';

import type { MapRef, ViewState } from 'react-map-gl/maplibre';
import type { KitchenRead } from 'src/lib/api/kitchens';
import type { BranchRead } from 'src/lib/api/companies';

import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
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
import { RouterLink } from 'src/routes/components';

import { fDateTime } from 'src/utils/format-time';

import { getImagePreviewUrl } from 'src/lib/image-url';
import { DashboardContent } from 'src/layouts/dashboard';
import { fetchKitchen, updateKitchen, fetchKitchenMe } from 'src/lib/api/kitchens';
import {
  requestCompanyKitchen,
  disconnectCompanyKitchen,
  fetchCompanyKitchenCatalog,
} from 'src/lib/api/companies';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  Map,
  MapMarker,
  MapControls,
  MapCenterPin,
  MapLocateButton,
  type GeolocateCoords,
  reverseGeocodeAddress,
  MapAddressAutocomplete,
  type MapAddressSuggestion,
} from 'src/components/map';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

const DEFAULT_LAT = 41.2995;
const DEFAULT_LNG = 69.2401;

type KitchenDetail = KitchenRead & {
  connected_branch_ids?: string[];
  pending_branch_ids?: string[];
};

type InfoItem = {
  label: string;
  value: string;
  icon: string;
};

// ----------------------------------------------------------------------

function BranchSelectDialog({
  open,
  branches,
  alreadyConnected,
  loading,
  onClose,
  onConfirm,
}: {
  open: boolean;
  branches: BranchRead[];
  alreadyConnected: string[];
  loading: boolean;
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (!open) setSelected([]);
  }, [open]);

  const toggle = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((branchId) => branchId !== id) : [...current, id]
    );
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
        <Box>
          {branches.map((branch) => {
            const isConnected = alreadyConnected.includes(branch.id);
            const isSelected = selected.includes(branch.id);

            return (
              <ListItem key={branch.id} disablePadding>
                <ListItemButton
                  disabled={isConnected || loading}
                  onClick={() => toggle(branch.id)}
                  selected={isSelected}
                  sx={{
                    px: 3,
                    py: 2.25,
                    gap: 2,
                    minHeight: 88,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    bgcolor: isConnected || isSelected ? 'action.selected' : 'background.paper',
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
                      bgcolor: isConnected || isSelected ? 'action.selected' : 'action.hover',
                    },
                  }}
                >
                  <Checkbox
                    checked={isConnected || isSelected}
                    disabled={isConnected || loading}
                    onChange={() => toggle(branch.id)}
                    onClick={(event) => event.stopPropagation()}
                    sx={{ p: 0, flexShrink: 0 }}
                  />
                  <ListItemText
                    primary={branch.name}
                    secondary={branch.address}
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
                  {isConnected && (
                    <Typography variant="subtitle2" sx={{ flexShrink: 0, fontWeight: 700 }}>
                      Biriktirilgan
                    </Typography>
                  )}
                </ListItemButton>
              </ListItem>
            );
          })}
        </Box>
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
        <LoadingButton
          fullWidth
          variant="contained"
          loading={loading}
          disabled={selected.length === 0}
          onClick={() => onConfirm(selected)}
          sx={{ minHeight: 44, borderRadius: 1.5 }}
        >
          Saqlash
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

// ----------------------------------------------------------------------

export function KitchenDetailView({ id }: { id: string }) {
  const mapRef = useRef<MapRef | null>(null);
  const { user } = useAuthContext();
  const isSuperAdmin = user?.role === 'super_admin';
  const isCompanyAdmin = user?.role === 'company_admin';
  const isKitchenAdmin = user?.role === 'kitchen_admin';

  const [kitchen, setKitchen] = useState<KitchenDetail | null>(null);
  const [branches, setBranches] = useState<BranchRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [branchLoading, setBranchLoading] = useState(false);
  const [branchDialog, setBranchDialog] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [hasLocation, setHasLocation] = useState(false);
  const [addressSearch, setAddressSearch] = useState('');
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const reverseLookupId = useRef(0);
  const [locationMarker, setLocationMarker] = useState({
    latitude: DEFAULT_LAT,
    longitude: DEFAULT_LNG,
  });
  const [locationViewState, setLocationViewState] = useState<Partial<ViewState>>({
    latitude: DEFAULT_LAT,
    longitude: DEFAULT_LNG,
    zoom: 13,
  });

  const applyKitchen = useCallback((data: KitchenDetail) => {
    setKitchen(data);

    if (data.lat != null && data.lng != null) {
      setLocationMarker({ latitude: data.lat, longitude: data.lng });
      setLocationViewState({ latitude: data.lat, longitude: data.lng, zoom: 13 });
      setHasLocation(true);
    } else {
      setHasLocation(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      if (isSuperAdmin) {
        applyKitchen(await fetchKitchen(id));
        setBranches([]);
        return;
      }

      if (isCompanyAdmin) {
        const result = await fetchCompanyKitchenCatalog();
        const selectedKitchen = result.kitchens.find((item) => item.id === id);

        if (!selectedKitchen) throw new Error('Oshxona topilmadi');

        setBranches(result.branches);
        applyKitchen(selectedKitchen);
        return;
      }

      if (isKitchenAdmin) {
        const ownKitchen = await fetchKitchenMe();

        if (ownKitchen.id !== id) throw new Error("Bu oshxonani ko'rish huquqi yo'q");

        applyKitchen(ownKitchen);
      }
    } catch (error) {
      setKitchen(null);
      setErrorMessage(error instanceof Error ? error.message : "Ma'lumotlarni yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  }, [applyKitchen, id, isCompanyAdmin, isKitchenAdmin, isSuperAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleStatus = async () => {
    if (!isSuperAdmin || !kitchen) return;

    try {
      setStatusLoading(true);
      const updatedKitchen = await updateKitchen(kitchen.id, {
        is_active: !kitchen.is_active,
      });
      applyKitchen(updatedKitchen);
      toast.success(updatedKitchen.is_active ? 'Oshxona faollashtirildi' : 'Oshxona to‘xtatildi');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Statusni o'zgartirib bo'lmadi");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleConnect = async (branchIds: string[]) => {
    if (!kitchen) return;

    try {
      setBranchLoading(true);
      await Promise.all(
        branchIds.map((branchId) => requestCompanyKitchen(branchId, kitchen.id))
      );
      setBranchDialog(false);
      toast.success("Oshxonaga ulanish so'rovi yuborildi");
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Oshxonani ulab bo'lmadi");
    } finally {
      setBranchLoading(false);
    }
  };

  const handleDisconnect = async (branchId: string) => {
    if (!kitchen) return;

    try {
      setBranchLoading(true);
      await disconnectCompanyKitchen(branchId, kitchen.id);
      toast.success('Oshxona filialdan uzildi');
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Oshxonani uzib bo'lmadi");
    } finally {
      setBranchLoading(false);
    }
  };

  const handleLocationMoveEnd = useCallback(async (viewState: ViewState) => {
    if (!isSuperAdmin) return;
    setIsMapMoving(false);
    setLocationMarker({ latitude: viewState.latitude, longitude: viewState.longitude });
    setHasLocation(true);
    const lookupId = ++reverseLookupId.current;
    setIsResolvingAddress(true);
    try {
      const address = await reverseGeocodeAddress(viewState.latitude, viewState.longitude);
      if (lookupId === reverseLookupId.current && address?.label) setAddressSearch(address.label);
    } finally {
      if (lookupId === reverseLookupId.current) setIsResolvingAddress(false);
    }
  }, [isSuperAdmin]);

  const handleLocate = useCallback(({ latitude, longitude }: GeolocateCoords) => {
    setLocationMarker({ latitude, longitude });
    setHasLocation(true);
  }, []);

  const handleAddressSelect = useCallback((suggestion: MapAddressSuggestion) => {
    setAddressSearch(suggestion.label);
    setLocationMarker({ latitude: suggestion.lat, longitude: suggestion.lng });
    setHasLocation(true);
    mapRef.current?.flyTo({
      center: [suggestion.lng, suggestion.lat],
      zoom: 16,
      duration: 900,
    });
  }, []);

  const handleSaveLocation = async () => {
    if (!isSuperAdmin || !kitchen) return;

    try {
      setSavingLocation(true);
      const updatedKitchen = await updateKitchen(kitchen.id, {
        lat: locationMarker.latitude,
        lng: locationMarker.longitude,
      });
      applyKitchen(updatedKitchen);
      toast.success('Joylashuv saqlandi');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Joylashuvni saqlab bo'lmadi");
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

  if (!kitchen) {
    return (
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Oshxona"
          backHref={paths.dashboard.kitchen.root}
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Oshxonalar', href: paths.dashboard.kitchen.root },
            { name: 'Detail' },
          ]}
          sx={{ mb: 3 }}
        />
        <Alert severity="error">{errorMessage || 'Oshxona topilmadi'}</Alert>
      </DashboardContent>
    );
  }

  const connectedBranchIds = kitchen.connected_branch_ids ?? [];
  const pendingBranchIds = kitchen.pending_branch_ids ?? [];
  const connectedBranches = connectedBranchIds
    .map((branchId) => branches.find((branch) => branch.id === branchId))
    .filter((branch): branch is BranchRead => Boolean(branch));
  const hasAvailableBranches = new Set([...connectedBranchIds, ...pendingBranchIds]).size < branches.length;
  const imageUrl = kitchen.image_url ? getImagePreviewUrl(kitchen.image_url) : undefined;
  const infoItems: InfoItem[] = [
    {
      label: 'Telefon',
      value: kitchen.phone ?? 'Kiritilmagan',
      icon: 'solar:phone-outline',
    },
    {
      label: 'Buyurtma kesimi',
      value: kitchen.order_cutoff_time?.slice(0, 5) ?? 'Kiritilmagan',
      icon: 'solar:clock-circle-outline',
    },
    {
      label: 'Yetkazish vaqti',
      value: `${kitchen.delivery_start_time?.slice(0, 5)} - ${kitchen.delivery_end_time?.slice(0, 5)}`,
      icon: 'solar:scooter-outline',
    },
    {
      label: 'Yaratilgan sana',
      value: fDateTime(kitchen.created_at, 'DD MMM YYYY, HH:mm'),
      icon: 'custom:calendar-agenda-outline',
    },
  ];

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={kitchen.name}
        backHref={paths.dashboard.kitchen.root}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Oshxonalar', href: paths.dashboard.kitchen.root },
          { name: kitchen.name },
        ]}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              component={RouterLink}
              href={paths.dashboard.kitchen.root}
              variant="outlined"
              color="inherit"
              startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
            >
              Ro&apos;yxatga qaytish
            </Button>
            {isSuperAdmin && (
              <Button
                component={RouterLink}
                href={paths.dashboard.kitchen.edit(kitchen.id)}
                variant="contained"
                startIcon={<Iconify icon="solar:pen-bold" />}
              >
                Tahrirlash
              </Button>
            )}
          </Stack>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: { xs: 2.5, md: 3 }, mb: 3, borderRadius: 2 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2.5}
          sx={{ alignItems: { xs: 'stretch', md: 'center' } }}
        >
          <Avatar
            alt={kitchen.name}
            src={imageUrl}
            variant="rounded"
            sx={{
              width: 72,
              height: 72,
              bgcolor: 'primary.lighter',
              color: 'primary.dark',
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            {kitchen.name.charAt(0).toUpperCase()}
          </Avatar>

          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="h5">{kitchen.name}</Typography>
              <Chip
                size="small"
                variant="soft"
                color={kitchen.is_active ? 'success' : 'default'}
                label={kitchen.is_active ? 'Faol' : 'Nofaol'}
              />
            </Stack>

            <Typography variant="body2" sx={{ mt: 0.75, color: 'text.secondary', maxWidth: 720 }}>
              {kitchen.description || 'Tavsif kiritilmagan'}
            </Typography>
          </Box>

          {isSuperAdmin && (
            <LoadingButton
              loading={statusLoading}
              variant={kitchen.is_active ? 'outlined' : 'contained'}
              color={kitchen.is_active ? 'warning' : 'success'}
              startIcon={
                <Iconify
                  icon={
                    kitchen.is_active ? 'solar:forbidden-circle-bold' : 'solar:check-circle-bold'
                  }
                />
              }
              onClick={handleToggleStatus}
              sx={{ minWidth: 160 }}
            >
              {kitchen.is_active ? 'Nofaol qilish' : 'Faollashtirish'}
            </LoadingButton>
          )}
        </Stack>
      </Card>

      <Box
        sx={{
          mb: 3,
          gap: 2,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
        }}
      >
        {infoItems.map((item) => (
          <Card key={item.label} sx={{ p: 2, borderRadius: 2 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  display: 'grid',
                  borderRadius: 1.5,
                  color: 'primary.main',
                  placeItems: 'center',
                  bgcolor: 'primary.lighter',
                }}
              >
                <Iconify icon={item.icon as any} width={20} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {item.label}
                </Typography>
                <Typography variant="subtitle2" noWrap>
                  {item.value}
                </Typography>
              </Box>
            </Stack>
          </Card>
        ))}
      </Box>

      {isCompanyAdmin && (
        <Card sx={{ p: { xs: 2.5, md: 3 }, mb: 3, borderRadius: 2 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{
              mb: 2,
              alignItems: { xs: 'stretch', sm: 'center' },
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography variant="h6">Ulangan filiallar</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Oshxona xizmat ko&apos;rsatadigan filiallar
              </Typography>
            </Box>
            {hasAvailableBranches && (
              <Button
                variant="contained"
                startIcon={<Iconify icon="mingcute:add-line" />}
                disabled={branchLoading || branches.length === 0}
                onClick={() => setBranchDialog(true)}
              >
                Filialga ulash
              </Button>
            )}
          </Stack>

          {connectedBranches.length > 0 ? (
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {connectedBranches.map((branch) => (
                <Chip
                  key={branch.id}
                  variant="soft"
                  color="success"
                  label={branch.name}
                  disabled={branchLoading}
                  onDelete={() => handleDisconnect(branch.id)}
                  deleteIcon={<Iconify icon="mingcute:close-line" width={14} />}
                />
              ))}
            </Stack>
          ) : (
            <Box
              sx={{
                px: 2,
                py: 1.5,
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: 1.5,
                color: 'text.secondary',
                bgcolor: 'background.neutral',
              }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Iconify icon="solar:info-circle-bold" width={18} />
                <Typography variant="body2">Oshxona hali hech bir filialga ulanmagan</Typography>
              </Stack>
            </Box>
          )}
        </Card>
      )}

      <Card sx={{ p: { xs: 2.5, md: 3 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{
            mb: 2,
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography variant="h6">Joylashuv</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {isSuperAdmin
                ? 'Markerni sudrab oshxona joylashuvini yangilang'
                : 'Oshxonaning xaritadagi joylashuvi'}
            </Typography>
          </Box>

          {isSuperAdmin && (
            <LoadingButton
              variant="contained"
              loading={savingLocation}
              disabled={!hasLocation || isMapMoving || isResolvingAddress}
              startIcon={<Iconify icon="mingcute:location-fill" />}
              onClick={handleSaveLocation}
            >
              Saqlash
            </LoadingButton>
          )}
        </Stack>

        {isSuperAdmin && (
          <MapAddressAutocomplete
            value={addressSearch}
            onChange={setAddressSearch}
            onSelect={handleAddressSelect}
            latitude={locationMarker.latitude}
            longitude={locationMarker.longitude}
            label="Manzil qidirish"
          />
        )}

        <Box sx={{ position: 'relative', mt: isSuperAdmin ? 2 : 0 }}>
          <Map
            ref={mapRef}
            {...locationViewState}
            onMove={(event) => setLocationViewState(event.viewState)}
            onMoveStart={() => isSuperAdmin && setIsMapMoving(true)}
            onMoveEnd={(event) => handleLocationMoveEnd(event.viewState)}
            sx={{ height: { xs: 320, md: 420 }, borderRadius: 2, overflow: 'hidden' }}
          >
            <MapControls hideGeolocate={isSuperAdmin} />
            {hasLocation && !isSuperAdmin && (
              <MapMarker
                latitude={locationMarker.latitude}
                longitude={locationMarker.longitude}
                anchor="bottom"
                sx={{ color: '#FF416D' }}
              />
            )}
          </Map>

          {isSuperAdmin && <MapCenterPin moving={isMapMoving} />}

          {isSuperAdmin && <MapLocateButton mapRef={mapRef} onLocate={handleLocate} />}
        </Box>

        {hasLocation ? (
          <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }} />
          </Stack>
        ) : (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Oshxona koordinatasi kiritilmagan
          </Alert>
        )}
      </Card>

      {isCompanyAdmin && (
        <BranchSelectDialog
          open={branchDialog}
          branches={branches}
          alreadyConnected={[...connectedBranchIds, ...pendingBranchIds]}
          loading={branchLoading}
          onClose={() => setBranchDialog(false)}
          onConfirm={handleConnect}
        />
      )}
    </DashboardContent>
  );
}
