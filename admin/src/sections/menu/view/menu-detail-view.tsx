'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';

import { getImagePreviewUrl } from 'src/lib/image-url';
import { DashboardContent } from 'src/layouts/dashboard';

import { Image } from 'src/components/image';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useMeal, useSchedules, useCategories } from '../hooks/use-meals';

// ----------------------------------------------------------------------

const WEEK_DAYS = [
  { value: 1, label: 'Dushanba' },
  { value: 2, label: 'Seshanba' },
  { value: 3, label: 'Chorshanba' },
  { value: 4, label: 'Payshanba' },
  { value: 5, label: 'Juma' },
  { value: 6, label: 'Shanba' },
  { value: 7, label: 'Yakshanba' },
];

function dateToIsoWeekday(dateStr: string): number {
  const d = new Date(dateStr);
  const js = d.getUTCDay();
  return js === 0 ? 7 : js;
}

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
      <Box sx={{ maxWidth: 420, textAlign: { xs: 'left', sm: 'right' } }}>{value}</Box>
    </Stack>
  );
}

// ----------------------------------------------------------------------

type Props = { id: string };

export function MenuDetailView({ id }: Props) {
  const { data: meal, isLoading } = useMeal(id);
  const { data: categoriesData } = useCategories();
  const { data: schedulesData } = useSchedules({ meal_id: id });

  const categoryName =
    (categoriesData ?? []).find((category) => category.id === meal?.category_id)?.name ??
    'Tanlanmagan';

  const days = Array.from(
    new Set(
      (schedulesData ?? [])
        .map((schedule) =>
          schedule.day_of_week ?? (schedule.specific_date ? dateToIsoWeekday(schedule.specific_date) : null)
        )
        .filter((day): day is number => day != null)
    )
  ).sort((a, b) => a - b);

  if (isLoading) {
    return (
      <DashboardContent>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={meal?.name ?? 'Ovqat'}
        backHref={paths.dashboard.menu.root}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Menyu', href: paths.dashboard.menu.root },
          { name: meal?.name ?? 'Ovqat' },
        ]}
        action={
          meal && (
            <Button
              component={RouterLink}
              href={paths.dashboard.menu.edit(meal.id)}
              variant="contained"
              startIcon={<Iconify icon="solar:pen-bold" />}
            >
              Tahrirlash
            </Button>
          )
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {!meal ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">Ovqat topilmadi</Typography>
        </Card>
      ) : (
        <Card sx={{ maxWidth: 760, mx: 'auto', overflow: 'hidden' }}>
          {meal.image_url ? (
            <Image
              alt={meal.name}
              src={getImagePreviewUrl(meal.image_url)}
              ratio="16/9"
              visibleByDefault
            />
          ) : (
            <Box
              sx={{
                height: 240,
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'background.neutral',
              }}
            >
              <Iconify icon="solar:cup-star-bold" width={56} sx={{ color: 'text.disabled' }} />
            </Box>
          )}

          <Stack spacing={2.5} sx={{ p: 3 }}>
            <Box>
              <Typography variant="h4">{meal.name}</Typography>
              {meal.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {meal.description}
                </Typography>
              )}
            </Box>

            <Divider />

            <Box>
              <InfoRow
                label="Narxi"
                value={
                  <Typography variant="subtitle2">
                    {Number(meal.price).toLocaleString('uz-UZ')} so&apos;m
                  </Typography>
                }
              />
              <InfoRow
                label="Kategoriya"
                value={<Typography variant="body2">{categoryName}</Typography>}
              />
              <InfoRow
                label="Kunlar"
                value={
                  days.length > 0 ? (
                    <Box
                      sx={{
                        gap: 0.75,
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: { xs: 'flex-start', sm: 'flex-end' },
                      }}
                    >
                      {days.map((day) => (
                        <Chip
                          key={day}
                          size="small"
                          variant="outlined"
                          label={WEEK_DAYS.find((item) => item.value === day)?.label ?? day}
                        />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2">Belgilanmagan</Typography>
                  )
                }
              />
              <InfoRow
                label="Qo'shilgan"
                value={<Typography variant="body2">{fDate(meal.created_at)}</Typography>}
              />
            </Box>
          </Stack>
        </Card>
      )}
    </DashboardContent>
  );
}
