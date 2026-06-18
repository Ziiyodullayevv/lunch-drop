'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
  MapMarker,
  MapControls,
  Map as AppMap,
} from 'src/components/map';

import { useKitchens } from 'src/sections/kitchen/hooks/use-kitchens';

import { useAuthContext } from 'src/auth/hooks';

import { useBranch, useCompanyBranch, useCompanyBranchKitchens } from '../hooks/use-branches';

// ----------------------------------------------------------------------

type Props = {
  id: string;
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1}
      sx={{ py: 1.5, justifyContent: 'space-between' }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Box sx={{ maxWidth: 460, textAlign: { xs: 'left', sm: 'right' } }}>{value}</Box>
    </Stack>
  );
}

export function BranchDetailView({ id }: Props) {
  const { user } = useAuthContext();
  const isCompanyAdmin = user?.role === 'company_admin';
  const isSuperAdmin = user?.role === 'super_admin';

  const superBranch = useBranch(id, isSuperAdmin);
  const companyBranch = useCompanyBranch(id, isCompanyAdmin);
  const branchKitchens = useCompanyBranchKitchens(id, isCompanyAdmin);
  const { data: kitchensData } = useKitchens({ limit: 100 });

  const branch = isCompanyAdmin ? companyBranch.data : superBranch.data;
  const isLoading = isCompanyAdmin ? companyBranch.isLoading : superBranch.isLoading;
  const isError = isCompanyAdmin ? companyBranch.isError : superBranch.isError;
  const backHref = isSuperAdmin ? paths.dashboard.company.root : paths.dashboard.branch.root;
  const superKitchenNameById = new Map(
    (kitchensData?.items ?? []).map((kitchen) => [kitchen.id, kitchen.name])
  );

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

  const selectedKitchenNames = isCompanyAdmin
    ? (branchKitchens.data ?? []).map((kitchen) => kitchen.name)
    : (branch.kitchen_ids ?? []).map((kitchenId) => superKitchenNameById.get(kitchenId) ?? kitchenId);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={branch.name}
        backHref={backHref}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Filiallar', href: backHref },
          { name: branch.name },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.branch.edit(branch.id)}
            variant="contained"
            startIcon={<Iconify icon="solar:pen-bold" />}
          >
            Tahrirlash
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3, maxWidth: 600, width: '100%', mx: 'auto' }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h5">{branch.name}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {branch.address}
            </Typography>
          </Box>

          <Divider />

          <Box>
            <InfoRow
              label="Manzil"
              value={<Typography variant="body2">{branch.address}</Typography>}
            />
            <InfoRow
              label="Joylashuv"
              value={
                <Typography variant="body2">
                  {branch.lat.toFixed(6)}, {branch.lng.toFixed(6)}
                </Typography>
              }
            />
            <InfoRow
              label="Yaratilgan"
              value={<Typography variant="body2">{fDate(branch.created_at)}</Typography>}
            />
            <InfoRow
              label="Tanlangan oshxonalar"
              value={
                branchKitchens.isLoading && isCompanyAdmin ? (
                  <Typography variant="body2" color="text.secondary">
                    Yuklanmoqda...
                  </Typography>
                ) : selectedKitchenNames.length > 0 ? (
                  <Box
                    sx={{
                      gap: 0.75,
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: { xs: 'flex-start', sm: 'flex-end' },
                    }}
                  >
                    {selectedKitchenNames.map((name) => (
                      <Chip key={name} label={name} size="small" variant="soft" />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Oshxona tanlanmagan
                  </Typography>
                )
              }
            />
          </Box>

          <Box sx={{ position: 'relative' }}>
            <AppMap
              initialViewState={{ latitude: branch.lat, longitude: branch.lng, zoom: 14 }}
              sx={{ height: 320, borderRadius: 2, overflow: 'hidden' }}
            >
              <MapControls hideGeolocate />
              <MapMarker
                latitude={branch.lat}
                longitude={branch.lng}
                anchor="bottom"
                sx={{ color: '#3B82F6' }}
              />
            </AppMap>
          </Box>
        </Stack>
      </Card>
    </DashboardContent>
  );
}
