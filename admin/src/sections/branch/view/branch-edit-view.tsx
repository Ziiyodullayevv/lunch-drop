'use client';

import type { MapRef, MarkerDragEvent } from 'react-map-gl/maplibre';

import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import FormControl from '@mui/material/FormControl';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  MapMarker,
  MapControls,
  Map as AppMap,
  MapLocateButton,
  type GeolocateCoords,
  MapAddressAutocomplete,
  type MapAddressSuggestion,
} from 'src/components/map';

import { useKitchens } from 'src/sections/kitchen/hooks/use-kitchens';

import { useAuthContext } from 'src/auth/hooks';

import {
  useBranch,
  useUpdateBranch,
  useCompanyBranch,
  useAssignKitchens,
  useCompanyKitchens,
  useUpdateCompanyBranch,
  useAssignCompanyKitchens,
  useCompanyBranchKitchens,
} from '../hooks/use-branches';

// ----------------------------------------------------------------------

const DEFAULT_LAT = 41.2995;
const DEFAULT_LNG = 69.2401;

const BranchEditSchema = z.object({
  name: z.string().min(1, { message: 'Filial nomi majburiy' }),
  address: z.string().min(1, { message: 'Manzil majburiy' }),
  lat: z.number({ message: 'Joylashuvni xaritadan belgilang' }),
  lng: z.number({ message: 'Joylashuvni xaritadan belgilang' }),
});

type FormValues = z.infer<typeof BranchEditSchema>;

type Props = {
  id: string;
};

export function BranchEditView({ id }: Props) {
  const router = useRouter();
  const { user } = useAuthContext();
  const isCompanyAdmin = user?.role === 'company_admin';
  const isSuperAdmin = user?.role === 'super_admin';
  const mapRef = useRef<MapRef | null>(null);
  const [marker, setMarker] = useState({ latitude: DEFAULT_LAT, longitude: DEFAULT_LNG });

  const superBranch = useBranch(id, isSuperAdmin);
  const companyBranch = useCompanyBranch(id, isCompanyAdmin);
  const updateSuperBranch = useUpdateBranch(id);
  const updateCompanyBranch = useUpdateCompanyBranch(id);
  const assignSuperKitchens = useAssignKitchens(id);
  const assignCompanyKitchens = useAssignCompanyKitchens(id);
  const companyBranchKitchens = useCompanyBranchKitchens(id, isCompanyAdmin);
  const { data: superKitchensData, isLoading: isSuperKitchensLoading } = useKitchens(
    { limit: 100 },
    isSuperAdmin
  );
  const { data: companyKitchensData, isLoading: isCompanyKitchensLoading } =
    useCompanyKitchens(isCompanyAdmin);
  const [selectedKitchenIds, setSelectedKitchenIds] = useState<string[]>([]);

  const branch = isCompanyAdmin ? companyBranch.data : superBranch.data;
  const isLoading = isCompanyAdmin ? companyBranch.isLoading : superBranch.isLoading;
  const isError = isCompanyAdmin ? companyBranch.isError : superBranch.isError;
  const kitchens = isCompanyAdmin ? (companyKitchensData ?? []) : (superKitchensData?.items ?? []);
  const isKitchensLoading = isCompanyAdmin ? isCompanyKitchensLoading : isSuperKitchensLoading;
  const superKitchenNameById = new Map(
    (superKitchensData?.items ?? []).map((kitchen) => [kitchen.id, kitchen.name])
  );

  const methods = useForm<FormValues>({
    resolver: zodResolver(BranchEditSchema),
    defaultValues: {
      name: '',
      address: '',
      lat: undefined,
      lng: undefined,
    },
  });

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting },
  } = methods;

  const latVal = watch('lat');
  const lngVal = watch('lng');

  useEffect(() => {
    if (!branch) return;

    const nextMarker = {
      latitude: branch.lat ?? DEFAULT_LAT,
      longitude: branch.lng ?? DEFAULT_LNG,
    };

    reset({
      name: branch.name ?? '',
      address: branch.address ?? '',
      lat: nextMarker.latitude,
      lng: nextMarker.longitude,
    });
    setMarker(nextMarker);
    mapRef.current?.flyTo({
      center: [nextMarker.longitude, nextMarker.latitude],
      zoom: 14,
      duration: 0,
    });
  }, [branch, reset]);

  useEffect(() => {
    if (isCompanyAdmin) {
      if (!companyBranchKitchens.data) return;
      setSelectedKitchenIds(companyBranchKitchens.data.map((kitchen) => kitchen.id));
      return;
    }

    setSelectedKitchenIds(branch?.kitchen_ids ?? []);
  }, [branch?.kitchen_ids, companyBranchKitchens.data, isCompanyAdmin]);

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
      mapRef.current?.flyTo({
        center: [longitude, latitude],
        zoom: 16,
        duration: 900,
      });
    },
    [updateLocation]
  );

  const handleAddressSelect = useCallback(
    (suggestion: MapAddressSuggestion) => {
      updateLocation(suggestion.lat, suggestion.lng);
      setValue('address', suggestion.label, { shouldDirty: true, shouldValidate: true });
      mapRef.current?.flyTo({
        center: [suggestion.lng, suggestion.lat],
        zoom: 16,
        duration: 900,
      });
    },
    [setValue, updateLocation]
  );

  const onSubmit = handleSubmit(async (values) => {
    try {
      const payload = {
        name: values.name,
        address: values.address,
        lat: values.lat,
        lng: values.lng,
      };

      if (isCompanyAdmin) {
        await updateCompanyBranch.mutateAsync(payload);
        await assignCompanyKitchens.mutateAsync(selectedKitchenIds);
      } else {
        await updateSuperBranch.mutateAsync(payload);
        await assignSuperKitchens.mutateAsync(selectedKitchenIds);
      }

      toast.success('Filial yangilandi');
      router.push(isSuperAdmin ? paths.dashboard.company.root : paths.dashboard.branch.root);
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

  if (isError || !branch) {
    return (
      <DashboardContent>
        <Alert severity="error">Filial ma&apos;lumotlarini yuklab bo&apos;lmadi</Alert>
      </DashboardContent>
    );
  }

  const backHref = isSuperAdmin ? paths.dashboard.company.root : paths.dashboard.branch.root;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Filialni tahrirlash"
        backHref={backHref}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Filiallar', href: backHref },
          { name: branch.name },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3, maxWidth: 600, width: '100%', mx: 'auto' }}>
        <Form methods={methods} onSubmit={onSubmit}>
          <Stack spacing={3}>
            <Field.Text name="name" label="Filial nomi" slotProps={{ inputLabel: { shrink: true } }} />

            <Controller
              name="address"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <MapAddressAutocomplete
                  value={field.value}
                  onChange={field.onChange}
                  onSelect={handleAddressSelect}
                  latitude={marker.latitude}
                  longitude={marker.longitude}
                  error={!!error}
                  helperText={error?.message}
                />
              )}
            />

            <FormControl fullWidth>
              <InputLabel shrink>Oshxonalar</InputLabel>
              <Select
                multiple
                displayEmpty
                label="Oshxonalar"
                value={selectedKitchenIds}
                onChange={(event) => setSelectedKitchenIds(event.target.value as string[])}
                notched
                disabled={isKitchensLoading || (isCompanyAdmin && companyBranchKitchens.isLoading)}
                renderValue={(selected) => {
                  const selectedIds = selected as string[];

                  if (isKitchensLoading || (isCompanyAdmin && companyBranchKitchens.isLoading)) {
                    return <Typography variant="body2" color="text.disabled">Yuklanmoqda...</Typography>;
                  }
                  if (selectedIds.length === 0) {
                    return <Typography variant="body2" color="text.disabled">Oshxona tanlang</Typography>;
                  }

                  return (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selectedIds.map((kitchenId) => {
                        const kitchen = kitchens.find((item) => item.id === kitchenId);
                        return (
                          <Chip
                            key={kitchenId}
                            label={kitchen?.name ?? superKitchenNameById.get(kitchenId) ?? kitchenId}
                            size="small"
                          />
                        );
                      })}
                    </Box>
                  );
                }}
              >
                {kitchens.length === 0 && !isKitchensLoading ? (
                  <MenuItem disabled>
                    <Typography variant="body2" color="text.disabled">Oshxona topilmadi</Typography>
                  </MenuItem>
                ) : (
                  kitchens.map((kitchen) => (
                    <MenuItem key={kitchen.id} value={kitchen.id}>
                      <Checkbox checked={selectedKitchenIds.includes(kitchen.id)} size="small" sx={{ mr: 1 }} />
                      {kitchen.name}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            <Divider>
              <Typography variant="caption" color="text.secondary">Joylashuv</Typography>
            </Divider>

            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary">
                Xaritadagi joylashuv — markerni sudrab o&apos;rnating
              </Typography>

              <Box sx={{ position: 'relative' }}>
                <AppMap
                  ref={mapRef}
                  initialViewState={{
                    latitude: marker.latitude,
                    longitude: marker.longitude,
                    zoom: 14,
                  }}
                  sx={{ height: 320, borderRadius: 2, overflow: 'hidden' }}
                >
                  <MapControls hideGeolocate />
                  <MapMarker
                    latitude={marker.latitude}
                    longitude={marker.longitude}
                    draggable
                    anchor="bottom"
                    onDragEnd={handleMarkerDragEnd}
                    sx={{ color: '#3B82F6' }}
                  />
                </AppMap>

                <MapLocateButton mapRef={mapRef} onLocate={handleLocate} />
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Typography variant="caption" color="text.secondary">Lat: {latVal?.toFixed(6)}</Typography>
                <Typography variant="caption" color="text.secondary">Lng: {lngVal?.toFixed(6)}</Typography>
              </Box>
            </Stack>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button component={RouterLink} href={backHref} variant="outlined" color="inherit">
                Bekor qilish
              </Button>
              <LoadingButton
                type="submit"
                variant="contained"
                loading={
                  isSubmitting || assignCompanyKitchens.isPending || assignSuperKitchens.isPending
                }
              >
                Saqlash
              </LoadingButton>
            </Box>
          </Stack>
        </Form>
      </Card>
    </DashboardContent>
  );
}
