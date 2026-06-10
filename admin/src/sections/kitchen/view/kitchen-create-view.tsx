'use client';

import type { Dayjs } from 'dayjs';
import type { MapRef, MarkerDragEvent } from 'react-map-gl/maplibre';
import type { GeolocateCoords } from 'src/components/map';

import * as z from 'zod';
import dayjs from 'dayjs';
import { useForm } from 'react-hook-form';
import { useRef, useState, useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import axios, { endpoints } from 'src/lib/axios';
import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { Map, MapMarker, MapControls, MapLocateButton } from 'src/components/map';

// ----------------------------------------------------------------------

const DEFAULT_LAT = 41.2995;
const DEFAULT_LNG = 69.2401;

function makeTime(hour: number, minute = 0): Dayjs {
  return dayjs().hour(hour).minute(minute).second(0).millisecond(0);
}

function formatTime(value: Dayjs | string | null | undefined): string | undefined {
  if (!value) return undefined;
  const d = dayjs.isDayjs(value) ? value : dayjs(value as string);
  return d.isValid() ? d.format('HH:mm') : undefined;
}

export const KitchenSchema = z.object({
  name:                z.string().min(1, { message: 'Oshxona nomi majburiy' }),
  description:         z.string().optional(),
  phone:               z.string().optional(),
  order_cutoff_time:   z.custom<Dayjs>().optional().nullable(),
  delivery_start_time: z.custom<Dayjs>().optional().nullable(),
  delivery_end_time:   z.custom<Dayjs>().optional().nullable(),
  is_active:           z.boolean(),
  latitude:            z.string().optional(),
  longitude:           z.string().optional(),
});

type FormValues = z.infer<typeof KitchenSchema>;

// ----------------------------------------------------------------------

export function KitchenCreateView() {
  const router = useRouter();
  const mapRef = useRef<MapRef | null>(null);
  const [marker, setMarker] = useState({ latitude: DEFAULT_LAT, longitude: DEFAULT_LNG });
  const [hasLocation, setHasLocation] = useState(false);

  const methods = useForm<FormValues>({
    resolver: zodResolver(KitchenSchema),
    defaultValues: {
      name:                '',
      description:         '',
      phone:               '',
      order_cutoff_time:   makeTime(11),
      delivery_start_time: makeTime(12),
      delivery_end_time:   makeTime(13),
      is_active:           true,
      latitude:            '',
      longitude:           '',
    },
  });

  const { handleSubmit, setValue, watch, formState: { isSubmitting } } = methods;
  const lat = watch('latitude');
  const lng = watch('longitude');

  const handleMarkerDrag = useCallback(
    (e: MarkerDragEvent) => {
      const { lat: newLat, lng: newLng } = e.lngLat;
      setMarker({ latitude: newLat, longitude: newLng });
      setValue('latitude', newLat.toFixed(6));
      setValue('longitude', newLng.toFixed(6));
      setHasLocation(true);
    },
    [setValue]
  );

  const handleLocate = useCallback(
    ({ latitude, longitude }: GeolocateCoords) => {
      setMarker({ latitude, longitude });
      setValue('latitude', latitude.toFixed(6));
      setValue('longitude', longitude.toFixed(6));
      setHasLocation(true);
    },
    [setValue]
  );

  const onSubmit = handleSubmit(async (data) => {
    try {
      await axios.post(endpoints.superAdmin.kitchens, {
        name:                data.name,
        description:         data.description || null,
        phone:               data.phone       || null,
        order_cutoff_time:   formatTime(data.order_cutoff_time),
        delivery_start_time: formatTime(data.delivery_start_time),
        delivery_end_time:   formatTime(data.delivery_end_time),
        is_active:           data.is_active,
        lat:  hasLocation && data.latitude  ? parseFloat(data.latitude)  : undefined,
        lng:  hasLocation && data.longitude ? parseFloat(data.longitude) : undefined,
      });
      toast.success('Oshxona yaratildi!');
      router.push(paths.dashboard.kitchen.root);
    } catch (err: any) {
      toast.error(err?.message || 'Xato yuz berdi');
    }
  });

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="New Kitchen"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Kitchens', href: paths.dashboard.kitchen.root },
          { name: 'New' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3, maxWidth: 900, width: '100%', mx: 'auto' }}>
        <Form methods={methods} onSubmit={onSubmit}>
          <Stack spacing={3}>
            <Field.Text name="name" label="Oshxona nomi" slotProps={{ inputLabel: { shrink: true } }} />
            <Field.Text name="description" label="Tavsif" multiline rows={3} slotProps={{ inputLabel: { shrink: true } }} />
            <Field.Phone name="phone" label="Telefon" country="UZ" />
            <Stack direction="row" spacing={2}>
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

            <Divider>
              <Typography variant="caption" color="text.secondary">Joylashuv</Typography>
            </Divider>

            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary">
                Xaritadagi joylashuv — markerni sudrab o&apos;rnating
              </Typography>
              <Box sx={{ position: 'relative' }}>
                <Map
                  ref={mapRef}
                  initialViewState={{ latitude: DEFAULT_LAT, longitude: DEFAULT_LNG, zoom: 12 }}
                  sx={{ height: 320, borderRadius: 2, overflow: 'hidden' }}
                >
                  <MapControls />
                  <MapMarker
                    latitude={marker.latitude}
                    longitude={marker.longitude}
                    draggable
                    anchor="bottom"
                    onDrag={handleMarkerDrag}
                    sx={{ color: hasLocation ? '#FF416D' : '#9CA3AF' }}
                  />
                </Map>

                <MapLocateButton mapRef={mapRef} onLocate={handleLocate} />
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                {hasLocation ? (
                  <>
                    <Typography variant="caption" color="text.secondary">Lat: {lat}</Typography>
                    <Typography variant="caption" color="text.secondary">Lng: {lng}</Typography>
                  </>
                ) : (
                  <Typography variant="caption" color="text.disabled">
                    Markerni sudrab joylashuvni belgilang (ixtiyoriy)
                  </Typography>
                )}
              </Box>
            </Stack>

            <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
              <Button component={RouterLink} href={paths.dashboard.kitchen.root} variant="outlined" color="inherit">
                Bekor qilish
              </Button>
              <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
                Yaratish
              </LoadingButton>
            </Stack>
          </Stack>
        </Form>
      </Card>
    </DashboardContent>
  );
}
