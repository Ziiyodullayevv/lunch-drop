'use client';

import type { MapRef, MarkerDragEvent } from 'react-map-gl/maplibre';
import type { GeolocateCoords } from 'src/components/map';
import type { CompanyKitchenRead } from 'src/lib/api/companies';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'next/navigation';
import { useRef, useState, useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

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

import { DashboardContent } from 'src/layouts/dashboard';
import { assignCompanyBranchKitchens } from 'src/lib/api/companies';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { Map, MapMarker, MapControls, MapLocateButton } from 'src/components/map';

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
  lat:        z.number().optional(),
  lng:        z.number().optional(),
});

type FormValues = z.infer<typeof BranchSchema>;

// ----------------------------------------------------------------------

export function BranchCreateView() {
  const router = useRouter();
  const { user } = useAuthContext();
  const searchParams = useSearchParams();
  const prefilledCompanyId = searchParams.get('company_id') ?? '';

  const isSuperAdmin   = user?.role === 'super_admin';
  const isCompanyAdmin = user?.role === 'company_admin';
  const mapRef = useRef<MapRef | null>(null);
  const [marker, setMarker]           = useState({ latitude: DEFAULT_LAT, longitude: DEFAULT_LNG });
  const [hasLocation, setHasLocation] = useState(false);

  const { data: companiesData } = useCompanies(isSuperAdmin ? undefined : undefined);
  const createBranch        = useCreateBranch();
  const createCompanyBranch = useCreateCompanyBranch();

  const { data: kitchensData } = useCompanyKitchens();
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

  const { handleSubmit, setValue, watch, formState: { isSubmitting } } = methods;
  const latVal = watch('lat');
  const lngVal = watch('lng');

  const handleMarkerDragEnd = useCallback(
    (e: MarkerDragEvent) => {
      const { lat: newLat, lng: newLng } = e.lngLat;
      setMarker({ latitude: newLat, longitude: newLng });
      setValue('lat', newLat);
      setValue('lng', newLng);
      setHasLocation(true);
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

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (isCompanyAdmin) {
        const branch = await createCompanyBranch.mutateAsync({
          name:    data.name,
          address: data.address,
          lat:     data.lat ?? 0,
          lng:     data.lng ?? 0,
        });
        if (selectedKitchenIds.length > 0) {
          await assignCompanyBranchKitchens(branch.id, selectedKitchenIds);
        }
      } else {
        await createBranch.mutateAsync({
          company_id: data.company_id,
          name:       data.name,
          address:    data.address,
          lat:        data.lat ?? 0,
          lng:        data.lng ?? 0,
        });
      }
      toast.success('Filial yaratildi');
      router.push(paths.dashboard.branch.root);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Xato yuz berdi');
    }
  });

  const backHref = isSuperAdmin ? paths.dashboard.company.root : paths.dashboard.branch.root;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Yangi filial"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Filiallar', href: backHref },
          { name: 'Yangi' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3, maxWidth: 900, width: '100%', mx: 'auto' }}>
        <Form methods={methods} onSubmit={onSubmit}>
          <Stack spacing={3}>
            {isSuperAdmin && (
              <Field.Select name="company_id" label="Kompaniya" slotProps={{ inputLabel: { shrink: true } }}>
                {companies.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Field.Select>
            )}

            <Field.Text name="name" label="Filial nomi" slotProps={{ inputLabel: { shrink: true } }} />
            <Field.Text name="address" label="Manzil" slotProps={{ inputLabel: { shrink: true } }} />

            {isCompanyAdmin && (
              <FormControl fullWidth>
                <InputLabel shrink>Oshxonalar</InputLabel>
                <Select
                  multiple
                  displayEmpty
                  label="Oshxonalar"
                  value={selectedKitchenIds}
                  onChange={(e) => setSelectedKitchenIds(e.target.value as string[])}
                  notched
                  renderValue={(selected) => {
                    if ((selected as string[]).length === 0) {
                      return <Typography variant="body2" color="text.disabled">Oshxona tanlang</Typography>;
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
                  {kitchens.map((k) => (
                    <MenuItem key={k.id} value={k.id}>
                      <Checkbox checked={selectedKitchenIds.includes(k.id)} size="small" sx={{ mr: 1 }} />
                      {k.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

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
                  <MapControls hideGeolocate />
                  <MapMarker
                    latitude={marker.latitude}
                    longitude={marker.longitude}
                    draggable
                    anchor="bottom"
                    onDragEnd={handleMarkerDragEnd}
                    sx={{ color: hasLocation ? '#3B82F6' : '#9CA3AF' }}
                  />
                </Map>

                <MapLocateButton mapRef={mapRef} onLocate={handleLocate} />
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                {hasLocation ? (
                  <>
                    <Typography variant="caption" color="text.secondary">Lat: {latVal?.toFixed(6)}</Typography>
                    <Typography variant="caption" color="text.secondary">Lng: {lngVal?.toFixed(6)}</Typography>
                  </>
                ) : (
                  <Typography variant="caption" color="text.disabled">
                    Markerni sudrab joylashuvni belgilang (ixtiyoriy)
                  </Typography>
                )}
              </Box>
            </Stack>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button component={RouterLink} href={backHref} variant="outlined" color="inherit">
                Bekor qilish
              </Button>
              <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
                Filial yaratish
              </LoadingButton>
            </Box>
          </Stack>
        </Form>
      </Card>
    </DashboardContent>
  );
}
