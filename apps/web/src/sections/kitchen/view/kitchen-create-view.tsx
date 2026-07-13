'use client';

import type { Dayjs } from 'dayjs';
import type { MapRef, ViewState } from 'react-map-gl/maplibre';
import type { KitchenCreate } from 'src/lib/api/kitchens';

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

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  Map,
  MapControls,
  MapCenterPin,
  MapLocateButton,
  type GeolocateCoords,
  reverseGeocodeAddress,
  MapAddressAutocomplete,
  type MapAddressSuggestion,
} from 'src/components/map';

import { useCreateKitchen } from '../hooks/use-kitchens';
import { useTranslate } from 'src/locales';

// ----------------------------------------------------------------------

const DEFAULT_LAT = 41.2995;
const DEFAULT_LNG = 69.2401;

function makeTime(hour: number, minute = 0): Dayjs {
  return dayjs().hour(hour).minute(minute).second(0).millisecond(0);
}

function formatTime(value: Dayjs | string | null | undefined): string | undefined {
  if (!value) return undefined;
  const d = dayjs.isDayjs(value) ? value : dayjs(value as string);
  return d.isValid() ? d.format('HH:mm:ss') : undefined;
}

export const KitchenSchema = z.object({
  name: z.string().trim().min(1, { message: 'Oshxona nomi majburiy' }).max(255),
  description: z.string().optional(),
  phone: z.string().max(32).optional(),
  image_url: z.string().optional(),
  order_cutoff_time: z.custom<Dayjs>().optional().nullable(),
  delivery_start_time: z.custom<Dayjs>().optional().nullable(),
  delivery_end_time: z.custom<Dayjs>().optional().nullable(),
  is_active: z.boolean(),
  lat: z.number({ message: 'Joylashuvni xaritadan belgilang' }),
  lng: z.number({ message: 'Joylashuvni xaritadan belgilang' }),
});

type FormValues = z.infer<typeof KitchenSchema>;

export function buildKitchenCreatePayload(data: FormValues): KitchenCreate {
  return {
    name: data.name,
    description: data.description || null,
    phone: data.phone || null,
    image_url: data.image_url || null,
    order_cutoff_time: formatTime(data.order_cutoff_time),
    delivery_start_time: formatTime(data.delivery_start_time),
    delivery_end_time: formatTime(data.delivery_end_time),
    is_active: data.is_active,
    lat: data.lat,
    lng: data.lng,
  };
}

// ----------------------------------------------------------------------

export function KitchenCreateView() {
  const { t } = useTranslate('common');
  const router = useRouter();
  const createKitchen = useCreateKitchen();
  const mapRef = useRef<MapRef | null>(null);
  const [marker, setMarker] = useState({ latitude: DEFAULT_LAT, longitude: DEFAULT_LNG });
  const [hasLocation, setHasLocation] = useState(false);
  const [addressSearch, setAddressSearch] = useState('');
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const reverseLookupId = useRef(0);

  const methods = useForm<FormValues>({
    resolver: zodResolver(KitchenSchema),
    defaultValues: {
      name: '',
      description: '',
      phone: '',
      image_url: '',
      order_cutoff_time: makeTime(10, 30),
      delivery_start_time: makeTime(12, 30),
      delivery_end_time: makeTime(13),
      is_active: true,
      lat: undefined,
      lng: undefined,
    },
  });

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = methods;
  const lat = watch('lat');
  const lng = watch('lng');

  const handleMapMoveEnd = useCallback(
    async (viewState: ViewState) => {
      setIsMapMoving(false);
      setMarker({ latitude: viewState.latitude, longitude: viewState.longitude });
      setValue('lat', viewState.latitude, { shouldDirty: true, shouldValidate: true });
      setValue('lng', viewState.longitude, { shouldDirty: true, shouldValidate: true });
      setHasLocation(true);
      const lookupId = ++reverseLookupId.current;
      setIsResolvingAddress(true);
      try {
        const address = await reverseGeocodeAddress(viewState.latitude, viewState.longitude);
        if (lookupId === reverseLookupId.current && address?.label) setAddressSearch(address.label);
      } finally {
        if (lookupId === reverseLookupId.current) setIsResolvingAddress(false);
      }
    },
    [setValue]
  );

  const handleLocate = useCallback(
    ({ latitude, longitude }: GeolocateCoords) => {
      setMarker({ latitude, longitude });
      setValue('lat', latitude, { shouldDirty: true, shouldValidate: true });
      setValue('lng', longitude, { shouldDirty: true, shouldValidate: true });
      setHasLocation(true);
    },
    [setValue]
  );

  const handleAddressSelect = useCallback(
    (suggestion: MapAddressSuggestion) => {
      setAddressSearch(suggestion.label);
      handleLocate({ latitude: suggestion.lat, longitude: suggestion.lng });
      mapRef.current?.flyTo({
        center: [suggestion.lng, suggestion.lat],
        zoom: 16,
        duration: 900,
      });
    },
    [handleLocate]
  );

  const onSubmit = handleSubmit(
    async (data) => {
      try {
        await createKitchen.mutateAsync(buildKitchenCreatePayload(data));
        toast.success(t('kitchenExtra.created'));
        router.push(paths.dashboard.kitchen.root);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : t('kitchenExtra.error'));
      }
    },
    (validationErrors) => {
      if (validationErrors.lat || validationErrors.lng) {
        toast.error(t('kitchenExtra.locationRequired'));
      }
    }
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={t('kitchenExtra.new')}
        links={[
          { name: t('navigation.dashboard'), href: paths.dashboard.root },
          { name: t('kitchen.title'), href: paths.dashboard.kitchen.root },
          { name: t('kitchenExtra.newShort') },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3, maxWidth: 600, width: '100%', mx: 'auto' }}>
        <Form methods={methods} onSubmit={onSubmit}>
          <Stack spacing={3}>
            <Field.Text
              name="name"
              label={t('kitchenExtra.name')}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Field.Text
              name="description"
              label={t('kitchenExtra.description')}
              multiline
              rows={3}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Field.ImageUpload name="image_url" label={t('kitchenExtra.image')} prefix="kitchens" />
            <Field.Phone name="phone" label={t('kitchenExtra.phone')} country="UZ" />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Field.TimePicker
                name="order_cutoff_time"
                label={t('kitchenExtra.cutoff')}
                ampm={false}
                views={['hours', 'minutes']}
                format="HH:mm"
                sx={{ flex: 1 }}
              />
              <Field.TimePicker
                name="delivery_start_time"
                label={t('kitchenExtra.deliveryStart')}
                ampm={false}
                views={['hours', 'minutes']}
                format="HH:mm"
                sx={{ flex: 1 }}
              />
              <Field.TimePicker
                name="delivery_end_time"
                label={t('kitchenExtra.deliveryEnd')}
                ampm={false}
                views={['hours', 'minutes']}
                format="HH:mm"
                sx={{ flex: 1 }}
              />
            </Stack>
            <Field.Switch name="is_active" label={t('map.active')} />

            <MapAddressAutocomplete
              value={addressSearch}
              onChange={setAddressSearch}
              onSelect={handleAddressSelect}
              latitude={marker.latitude}
              longitude={marker.longitude}
              label={t('kitchenExtra.searchAddress')}
            />

            <Divider>
              <Typography variant="caption" color="text.secondary">
                {t('kitchenExtra.location')}
              </Typography>
            </Divider>

            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary">
                {t('kitchenExtra.mapHint')}
              </Typography>
              <Box sx={{ position: 'relative' }}>
                <Map
                  ref={mapRef}
                  initialViewState={{ latitude: DEFAULT_LAT, longitude: DEFAULT_LNG, zoom: 12 }}
                  onMoveStart={() => setIsMapMoving(true)}
                  onMoveEnd={(event) => handleMapMoveEnd(event.viewState)}
                  sx={{ height: 320, borderRadius: 2, overflow: 'hidden' }}
                >
                  <MapControls />
                </Map>

                <MapCenterPin moving={isMapMoving} />

                <MapLocateButton mapRef={mapRef} onLocate={handleLocate} />
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                {hasLocation ? (
                  <>
                    <Typography variant="caption" color="text.secondary">
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                    </Typography>
                  </>
                ) : (
                  <Typography
                    variant="caption"
                    color={errors.lat || errors.lng ? 'error' : 'text.disabled'}
                  >
                    {errors.lat?.message ??
                      errors.lng?.message ??
                      t('kitchenExtra.mapRequired')}
                  </Typography>
                )}
              </Box>
            </Stack>

            <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
              <Button
                component={RouterLink}
                href={paths.dashboard.kitchen.root}
                variant="outlined"
                color="inherit"
              >
                {t('common.cancel')}
              </Button>
              <LoadingButton
                type="submit"
                variant="contained"
                loading={isSubmitting}
                disabled={isMapMoving || isResolvingAddress}
              >
                {t('kitchenExtra.create')}
              </LoadingButton>
            </Stack>
          </Stack>
        </Form>
      </Card>
    </DashboardContent>
  );
}
