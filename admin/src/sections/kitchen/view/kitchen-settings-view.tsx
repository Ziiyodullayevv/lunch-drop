'use client';

import type { Dayjs } from 'dayjs';
import type { MapRef, ViewState, MarkerDragEvent } from 'react-map-gl/maplibre';
import type { GeolocateCoords } from 'src/components/map';

import dayjs from 'dayjs';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { Map, MapMarker, MapControls, MapLocateButton } from 'src/components/map';

import { useKitchenMe, useUpdateKitchenSettings } from 'src/sections/kitchen/hooks/use-kitchens';

// ----------------------------------------------------------------------

const DEFAULT_LAT = 41.2995;
const DEFAULT_LNG = 69.2401;

function timeToDayjs(t: string | undefined | null): Dayjs {
  const [h, m] = (t ?? '00:00').split(':');
  return dayjs().hour(parseInt(h, 10)).minute(parseInt(m ?? '0', 10)).second(0);
}

function dayjsToTime(d: Dayjs | null): string {
  return d?.isValid() ? d.format('HH:mm:ss') : '00:00:00';
}

// ----------------------------------------------------------------------

export function KitchenSettingsView() {
  const mapRef = useRef<MapRef | null>(null);

  const { data: kitchen, isLoading, isError } = useKitchenMe();
  const updateMutation = useUpdateKitchenSettings();

  const [times, setTimes] = useState<{
    order_cutoff_time: Dayjs;
    delivery_start_time: Dayjs;
    delivery_end_time: Dayjs;
  } | null>(null);

  const [locationDirty, setLocationDirty] = useState(false);
  const [marker, setMarker] = useState({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
  const [viewState, setViewState] = useState<Partial<ViewState>>({
    latitude: DEFAULT_LAT,
    longitude: DEFAULT_LNG,
    zoom: 13,
  });
  const markerInitialized = useRef(false);

  // kitchen data kelganda marker ni bir marta init qilamiz (render ichida emas)
  useEffect(() => {
    if (kitchen && !markerInitialized.current && kitchen.lat != null) {
      markerInitialized.current = true;
      setMarker({ lat: kitchen.lat, lng: kitchen.lng });
      setViewState({ latitude: kitchen.lat, longitude: kitchen.lng, zoom: 13 });
    }
  }, [kitchen]);

  // kitchen data kelganda form state ni bir marta init qilamiz
  const resolved = times ?? (kitchen
    ? {
        order_cutoff_time:   timeToDayjs(kitchen.order_cutoff_time),
        delivery_start_time: timeToDayjs(kitchen.delivery_start_time),
        delivery_end_time:   timeToDayjs(kitchen.delivery_end_time),
      }
    : null);

  const form = times ?? (resolved ? {
    order_cutoff_time:   resolved.order_cutoff_time,
    delivery_start_time: resolved.delivery_start_time,
    delivery_end_time:   resolved.delivery_end_time,
  } : {
    order_cutoff_time:   timeToDayjs('11:00'),
    delivery_start_time: timeToDayjs('12:30'),
    delivery_end_time:   timeToDayjs('13:00'),
  });

  const handleTimeChange = (field: keyof typeof form) => (value: Dayjs | null) => {
    setTimes((prev) => ({
      ...(prev ?? form),
      [field]: value ?? timeToDayjs('00:00'),
    }));
  };

  const handleSaveTimes = async () => {
    try {
      await updateMutation.mutateAsync({
        order_cutoff_time:   dayjsToTime(form.order_cutoff_time),
        delivery_start_time: dayjsToTime(form.delivery_start_time),
        delivery_end_time:   dayjsToTime(form.delivery_end_time),
      });
      toast.success('Vaqt sozlamalari saqlandi');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Saqlashda xatolik yuz berdi';
      toast.error(msg);
    }
  };

  const handleMarkerDragEnd = useCallback((e: MarkerDragEvent) => {
    const { lat, lng } = e.lngLat;
    setMarker({ lat, lng });
    setLocationDirty(true);
  }, []);

  const handleLocate = useCallback(({ latitude, longitude }: GeolocateCoords) => {
    setMarker({ lat: latitude, lng: longitude });
    setLocationDirty(true);
  }, []);

  const handleSaveLocation = () => {
    toast.info("Joylashuvni o'zgartirish super admin orqali amalga oshiriladi");
    setLocationDirty(false);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <DashboardContent>
        <Alert severity="error">Sozlamalar yuklanmadi. Sahifani yangilang.</Alert>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Oshxona sozlamalari"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Sozlamalar' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={3} sx={{ maxWidth: 900, mx: 'auto', width: '100%' }}>
        {/* Vaqt sozlamalari */}
        <Card>
          <Box sx={{ px: 3, pt: 3, pb: 1 }}>
            <Typography variant="h6">Buyurtma va yetkazish vaqtlari</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Mobil ilovada ko&apos;rsatiladigan vaqt oralig&apos;ini belgilang
            </Typography>
          </Box>

          <Divider sx={{ mt: 2 }} />

          <Stack spacing={3} sx={{ px: 3, py: 3 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Iconify icon="solar:clock-circle-bold" width={18} />
                Buyurtma qabul qilish tugashi
              </Typography>
              <TimePicker
                value={form.order_cutoff_time}
                onChange={handleTimeChange('order_cutoff_time')}
                ampm={false}
                minutesStep={5}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    helperText: 'Shu vaqtgacha buyurtma qabul qilinadi (masalan: 11:00)',
                  },
                }}
              />
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Iconify icon="solar:forward-bold" width={18} />
                Yetkazish vaqt oralig&apos;i
              </Typography>
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <TimePicker
                  value={form.delivery_start_time}
                  onChange={handleTimeChange('delivery_start_time')}
                  ampm={false}
                  minutesStep={5}
                  label="Boshlanishi"
                  slotProps={{ textField: { fullWidth: true } }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>—</Typography>
                <TimePicker
                  value={form.delivery_end_time}
                  onChange={handleTimeChange('delivery_end_time')}
                  ampm={false}
                  minutesStep={5}
                  label="Tugashi"
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Masalan: 12:30 — 13:00 oralig&apos;ida yetkaziladi
              </Typography>
            </Box>

            <Box
              sx={{
                p: 2,
                borderRadius: 1.5,
                bgcolor: 'background.neutral',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <Iconify icon="solar:smartphone-2-bold" width={20} color="text.secondary" />
              <Typography variant="body2" color="text.secondary">
                Mobil ilovada:{' '}
                <strong>
                  {dayjsToTime(form.delivery_start_time).slice(0, 5)}
                  {' — '}
                  {dayjsToTime(form.delivery_end_time).slice(0, 5)}
                  {' '}oralig&apos;ida
                </strong>
              </Typography>
            </Box>
          </Stack>

          <Divider />

          <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <LoadingButton
              variant="contained"
              loading={updateMutation.isPending}
              onClick={handleSaveTimes}
              startIcon={<Iconify icon="solar:check-circle-bold" />}
            >
              Saqlash
            </LoadingButton>
          </Box>
        </Card>

        {/* Joylashuv */}
        <Card>
          <Box sx={{ px: 3, pt: 3, pb: 1 }}>
            <Typography variant="h6">Joylashuv</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Oshxonangizning xaritadagi joylashuvi
            </Typography>
          </Box>

          <Divider sx={{ mt: 2 }} />

          <Box sx={{ px: 3, py: 3 }}>
            <Box sx={{ position: 'relative' }}>
              <Map
                ref={mapRef}
                {...viewState}
                onMove={(evt) => setViewState(evt.viewState)}
                sx={{ height: 340, borderRadius: 2, overflow: 'hidden' }}
              >
                <MapControls hideGeolocate />
                <MapMarker
                  latitude={marker.lat}
                  longitude={marker.lng}
                  draggable
                  anchor="bottom"
                  onDragEnd={handleMarkerDragEnd}
                  sx={{ color: '#FF416D' }}
                />
              </Map>

              <MapLocateButton mapRef={mapRef} onLocate={handleLocate} />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Lat: {marker.lat.toFixed(6)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Lng: {marker.lng.toFixed(6)}
              </Typography>
            </Box>
          </Box>

          <Divider />

          <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <LoadingButton
              variant="contained"
              disabled={!locationDirty}
              onClick={handleSaveLocation}
              startIcon={<Iconify icon={"solar:map-point-bold" as any} />}
            >
              Joylashuvni saqlash
            </LoadingButton>
          </Box>
        </Card>
      </Stack>
    </DashboardContent>
  );
}
