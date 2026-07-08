'use client';

import type * as z from 'zod';
import type { Dayjs } from 'dayjs';
import type { MapRef, MarkerDragEvent } from 'react-map-gl/maplibre';

import dayjs from 'dayjs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  Map,
  MapMarker,
  MapControls,
  MapLocateButton,
  type GeolocateCoords,
  MapAddressAutocomplete,
  type MapAddressSuggestion,
} from 'src/components/map';

import { useKitchen, useUpdateKitchen } from '../hooks/use-kitchens';
import { KitchenSchema, buildKitchenCreatePayload } from './kitchen-create-view';

type FormValues = z.infer<typeof KitchenSchema>;

const DEFAULT_LAT = 41.2995;
const DEFAULT_LNG = 69.2401;

function parseTime(value: string | null | undefined): Dayjs | null {
  if (!value) return null;

  const parsed = dayjs(`2000-01-01T${value}`);
  return parsed.isValid() ? parsed : null;
}

type Props = { id: string };

export function KitchenEditView({ id }: Props) {
  const router = useRouter();
  const mapRef = useRef<MapRef | null>(null);
  const { data, isLoading, isError } = useKitchen(id);
  const updateKitchen = useUpdateKitchen(id);
  const [marker, setMarker] = useState({ latitude: DEFAULT_LAT, longitude: DEFAULT_LNG });
  const [addressSearch, setAddressSearch] = useState('');

  const methods = useForm<FormValues>({
    resolver: zodResolver(KitchenSchema),
    defaultValues: {
      name: '',
      description: '',
      phone: '',
      image_url: '',
      order_cutoff_time: null,
      delivery_start_time: null,
      delivery_end_time: null,
      is_active: true,
      lat: undefined,
      lng: undefined,
    },
  });

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = methods;
  const lat = watch('lat');
  const lng = watch('lng');

  useEffect(() => {
    if (!data) return;

    reset({
      name: data.name,
      description: data.description ?? '',
      phone: data.phone ?? '',
      image_url: data.image_url ?? '',
      order_cutoff_time: parseTime(data.order_cutoff_time),
      delivery_start_time: parseTime(data.delivery_start_time),
      delivery_end_time: parseTime(data.delivery_end_time),
      is_active: data.is_active,
      lat: data.lat,
      lng: data.lng,
    });
    setMarker({ latitude: data.lat, longitude: data.lng });
    mapRef.current?.flyTo({ center: [data.lng, data.lat], zoom: 14 });
  }, [data, reset]);

  const updateLocation = useCallback(
    (latitude: number, longitude: number) => {
      setMarker({ latitude, longitude });
      setValue('lat', latitude, { shouldDirty: true, shouldValidate: true });
      setValue('lng', longitude, { shouldDirty: true, shouldValidate: true });
    },
    [setValue]
  );

  const handleMarkerDragEnd = useCallback(
    (event: MarkerDragEvent) => {
      updateLocation(event.lngLat.lat, event.lngLat.lng);
    },
    [updateLocation]
  );

  const handleLocate = useCallback(
    ({ latitude, longitude }: GeolocateCoords) => {
      updateLocation(latitude, longitude);
    },
    [updateLocation]
  );

  const handleAddressSelect = useCallback(
    (suggestion: MapAddressSuggestion) => {
      setAddressSearch(suggestion.label);
      updateLocation(suggestion.lat, suggestion.lng);
      mapRef.current?.flyTo({
        center: [suggestion.lng, suggestion.lat],
        zoom: 16,
        duration: 900,
      });
    },
    [updateLocation]
  );

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateKitchen.mutateAsync(buildKitchenCreatePayload(values));
      toast.success('Oshxona yangilandi');
      router.push(paths.dashboard.kitchen.root);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Xato yuz berdi');
    }
  });

  if (isLoading) {
    return (
      <DashboardContent>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  if (isError || !data) {
    return (
      <DashboardContent>
        <Alert severity="error">Oshxona ma&apos;lumotlarini yuklab bo&apos;lmadi</Alert>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Oshxonani tahrirlash"
        backHref={paths.dashboard.kitchen.root}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Oshxonalar', href: paths.dashboard.kitchen.root },
          { name: data.name, href: paths.dashboard.kitchen.details(id) },
          { name: 'Tahrirlash' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3, maxWidth: 600, width: '100%', mx: 'auto' }}>
        <Form methods={methods} onSubmit={onSubmit}>
          <Stack spacing={3}>
            <Field.Text
              name="name"
              label="Oshxona nomi"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Field.Text
              name="description"
              label="Tavsif"
              multiline
              rows={3}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Field.ImageUpload name="image_url" label="Rasm" prefix="kitchens" />
            <Field.Phone name="phone" label="Oshxona telefoni" country="UZ" />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Field.TimePicker
                name="order_cutoff_time"
                label="Buyurtma yopilish vaqti"
                ampm={false}
                views={['hours', 'minutes']}
                format="HH:mm"
                sx={{ flex: 1 }}
              />
              <Field.TimePicker
                name="delivery_start_time"
                label="Yetkazish boshlanishi"
                ampm={false}
                views={['hours', 'minutes']}
                format="HH:mm"
                sx={{ flex: 1 }}
              />
              <Field.TimePicker
                name="delivery_end_time"
                label="Yetkazish tugashi"
                ampm={false}
                views={['hours', 'minutes']}
                format="HH:mm"
                sx={{ flex: 1 }}
              />
            </Stack>

            <Field.Switch name="is_active" label="Faol" />

            <MapAddressAutocomplete
              value={addressSearch}
              onChange={setAddressSearch}
              onSelect={handleAddressSelect}
              latitude={marker.latitude}
              longitude={marker.longitude}
              label="Manzil qidirish"
            />

            <Divider>
              <Typography variant="caption" color="text.secondary">
                Joylashuv
              </Typography>
            </Divider>

            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary">
                Xaritadagi joylashuv - markerni sudrab o&apos;rnating
              </Typography>
              <Box sx={{ position: 'relative' }}>
                <Map
                  ref={mapRef}
                  initialViewState={{
                    latitude: data.lat,
                    longitude: data.lng,
                    zoom: 14,
                  }}
                  sx={{ height: 320, borderRadius: 2, overflow: 'hidden' }}
                >
                  <MapControls />
                  <MapMarker
                    latitude={marker.latitude}
                    longitude={marker.longitude}
                    draggable
                    anchor="bottom"
                    onDragEnd={handleMarkerDragEnd}
                    sx={{ color: '#FF416D' }}
                  />
                </Map>

                <MapLocateButton mapRef={mapRef} onLocate={handleLocate} />
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Typography variant="caption" color={errors.lat ? 'error' : 'text.secondary'}>
                  Lat: {lat?.toFixed(6)}
                </Typography>
                <Typography variant="caption" color={errors.lng ? 'error' : 'text.secondary'}>
                  Lng: {lng?.toFixed(6)}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
              <Button
                component={RouterLink}
                href={paths.dashboard.kitchen.details(id)}
                variant="outlined"
                color="inherit"
              >
                Bekor qilish
              </Button>
              <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
                Saqlash
              </LoadingButton>
            </Stack>
          </Stack>
        </Form>
      </Card>
    </DashboardContent>
  );
}
