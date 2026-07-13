'use client';

import type { MapRef, ViewState } from 'react-map-gl/maplibre';

import * as z from 'zod';
import { useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
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

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useTranslate } from 'src/locales';
import { DashboardContent } from 'src/layouts/dashboard';
import { addRecentBranch } from 'src/lib/recent-branches';
import { assignCompanyBranchKitchens } from 'src/lib/api/companies';

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

import { useCompanies } from 'src/sections/company/hooks/use-companies';

import { useAuthContext } from 'src/auth/hooks';

import { useCreateBranch, useCompanyKitchens, useCreateCompanyBranch } from '../hooks/use-branches';

// ----------------------------------------------------------------------

const DEFAULT_LAT = 41.2995;
const DEFAULT_LNG = 69.2401;

export const BranchSchema = z.object({
  company_id: z.string().min(1, { message: 'Kompaniya tanlanishi shart' }),
  name:       z.string().min(1, { message: 'Filial nomi majburiy' }),
  address:    z.string().min(1, { message: 'Manzil majburiy' }),
  lat:        z.number({ message: 'Joylashuvni xaritadan belgilang' }),
  lng:        z.number({ message: 'Joylashuvni xaritadan belgilang' }),
});

type FormValues = z.infer<typeof BranchSchema>;

// ----------------------------------------------------------------------

export function BranchCreateView() {
  const { t } = useTranslate('common');
  const router = useRouter();
  const { user } = useAuthContext();
  const searchParams = useSearchParams();
  const prefilledCompanyId = searchParams.get('company_id') ?? '';

  const isSuperAdmin   = user?.role === 'super_admin';
  const isCompanyAdmin = user?.role === 'company_admin';
  const mapRef = useRef<MapRef | null>(null);
  const [marker, setMarker]           = useState({ latitude: DEFAULT_LAT, longitude: DEFAULT_LNG });
  const [hasLocation, setHasLocation] = useState(false);
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const reverseLookupId = useRef(0);

  const { data: companiesData } = useCompanies(undefined, isSuperAdmin);
  const createBranch        = useCreateBranch();
  const createCompanyBranch = useCreateCompanyBranch();

  const { data: kitchensData, isLoading: kitchensLoading } = useCompanyKitchens(isCompanyAdmin);
  const kitchens = kitchensData ?? [];
  const [selectedKitchenIds, setSelectedKitchenIds] = useState<string[]>([]);

  const companies = companiesData?.items ?? [];

  const methods = useForm<FormValues>({
    resolver: zodResolver(BranchSchema),
    defaultValues: {
      company_id: prefilledCompanyId || (isSuperAdmin ? '' : (user?.company_id ?? '')),
      name:       '',
      address:    '',
      lat:        undefined,
      lng:        undefined,
    },
  });

  const { control, handleSubmit, setValue, watch, formState: { isSubmitting } } = methods;
  const latVal = watch('lat');
  const lngVal = watch('lng');

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
        if (lookupId === reverseLookupId.current && address?.label) {
          setValue('address', address.label, { shouldDirty: true, shouldValidate: true });
        }
      } finally {
        if (lookupId === reverseLookupId.current) setIsResolvingAddress(false);
      }
    },
    [setValue]
  );

  const handleLocate = useCallback(
    ({ latitude, longitude }: GeolocateCoords) => {
      setMarker({ latitude, longitude });
      setValue('lat', latitude);
      setValue('lng', longitude);
      setHasLocation(true);
    },
    [setValue]
  );

  const handleAddressSelect = useCallback(
    (suggestion: MapAddressSuggestion) => {
      const nextMarker = { latitude: suggestion.lat, longitude: suggestion.lng };
      setMarker(nextMarker);
      setHasLocation(true);
      setValue('address', suggestion.label, { shouldDirty: true, shouldValidate: true });
      setValue('lat', suggestion.lat, { shouldDirty: true, shouldValidate: true });
      setValue('lng', suggestion.lng, { shouldDirty: true, shouldValidate: true });
      mapRef.current?.flyTo({
        center: [suggestion.lng, suggestion.lat],
        zoom: 16,
        duration: 900,
      });
    },
    [setValue]
  );

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (isCompanyAdmin) {
        const branch = await createCompanyBranch.mutateAsync({
          name:    data.name,
          address: data.address,
          lat:     data.lat,
          lng:     data.lng,
        });
        if (selectedKitchenIds.length > 0) {
          await assignCompanyBranchKitchens(branch.id, selectedKitchenIds);
        }
      } else {
        const branch = await createBranch.mutateAsync({
          company_id: data.company_id,
          name:       data.name,
          address:    data.address,
          lat:        data.lat,
          lng:        data.lng,
        });
        addRecentBranch({ id: branch.id, companyId: branch.company_id });
      }
      toast.success(t('branch.created'));
      router.push(isSuperAdmin ? paths.dashboard.company.root : paths.dashboard.branch.root);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('branch.error'));
    }
  });

  const backHref = isSuperAdmin ? paths.dashboard.company.root : paths.dashboard.branch.root;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={t('branch.new')}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: t('branch.title'), href: backHref },
          { name: t('branch.newShort') },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3, maxWidth: 600, width: '100%', mx: 'auto' }}>
        <Form methods={methods} onSubmit={onSubmit}>
          <Stack spacing={3}>
            {isSuperAdmin && (
              <Field.Select name="company_id" label={t('map.company')} slotProps={{ inputLabel: { shrink: true } }}>
                {companies.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Field.Select>
            )}

            <Field.Text name="name" label={t('branch.name')} slotProps={{ inputLabel: { shrink: true } }} />
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

            {isCompanyAdmin && (
              <FormControl fullWidth>
                <InputLabel shrink>{t('branch.kitchens')}</InputLabel>
                <Select
                  multiple
                  displayEmpty
                  label={t('branch.kitchens')}
                  value={selectedKitchenIds}
                  onChange={(e) => setSelectedKitchenIds(e.target.value as string[])}
                  notched
                  disabled={kitchensLoading}
                  renderValue={(selected) => {
                    if (kitchensLoading) {
                      return <Typography variant="body2" color="text.disabled">Yuklanmoqda...</Typography>;
                    }
                    if ((selected as string[]).length === 0) {
                      return <Typography variant="body2" color="text.disabled">{t('branch.selectKitchen')}</Typography>;
                    }
                    return (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map((id) => {
                          const k = kitchens.find((x) => x.id === id);
                          return <Chip key={id} label={k?.name ?? id} size="small" />;
                        })}
                      </Box>
                    );
                  }}
                >
                  {kitchens.length === 0 && !kitchensLoading ? (
                    <MenuItem disabled>
                      <Typography variant="body2" color="text.disabled">{t('branch.noKitchen')}</Typography>
                    </MenuItem>
                  ) : (
                    kitchens.map((k) => (
                      <MenuItem key={k.id} value={k.id}>
                        <Checkbox checked={selectedKitchenIds.includes(k.id)} size="small" sx={{ mr: 1 }} />
                        {k.name}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            )}

            <Divider>
              <Typography variant="caption" color="text.secondary">Joylashuv</Typography>
            </Divider>

            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary">
                Xaritani surib joylashuvni belgilang
              </Typography>

              <Box sx={{ position: 'relative' }}>
                <Map
                  ref={mapRef}
                  initialViewState={{ latitude: DEFAULT_LAT, longitude: DEFAULT_LNG, zoom: 12 }}
                  onMoveStart={() => setIsMapMoving(true)}
                  onMoveEnd={(event) => handleMapMoveEnd(event.viewState)}
                  sx={{ height: 320, borderRadius: 2, overflow: 'hidden' }}
                >
                  <MapControls hideGeolocate />
                </Map>

                <MapCenterPin moving={isMapMoving} />

                <MapLocateButton mapRef={mapRef} onLocate={handleLocate} />
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                {hasLocation ? (
                  <>
                  </>
                ) : (
                  <Typography variant="caption" color="text.disabled">
                    Binafsha marker kerakli nuqtada turishi uchun xaritani suring (majburiy)
                  </Typography>
                )}
              </Box>
            </Stack>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button component={RouterLink} href={backHref} variant="outlined" color="inherit">
                {t('common.cancel')}
              </Button>
              <LoadingButton
                type="submit"
                variant="contained"
                loading={isSubmitting}
                disabled={isMapMoving || isResolvingAddress}
              >
                {t('branch.create')}
              </LoadingButton>
            </Box>
          </Stack>
        </Form>
      </Card>
    </DashboardContent>
  );
}
