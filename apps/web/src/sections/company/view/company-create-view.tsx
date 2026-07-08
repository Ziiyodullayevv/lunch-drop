'use client';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useCreateCompany } from '../hooks/use-companies';

// ----------------------------------------------------------------------

export const CompanySchema = z.object({
  name:        z.string().min(1, { message: 'Kompaniya nomi majburiy' }),
  description: z.string().optional(),
  logo_url:    z.string().optional(),
  billing_day: z.number().min(1).max(31).nullable().optional(),
});

type FormValues = z.infer<typeof CompanySchema>;

// ----------------------------------------------------------------------

export function CompanyCreateView() {
  const router = useRouter();
  const createCompany = useCreateCompany();

  const methods = useForm<FormValues>({
    resolver: zodResolver(CompanySchema),
    defaultValues: { name: '', description: '', logo_url: '', billing_day: null },
  });

  const { handleSubmit, formState: { isSubmitting } } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      await createCompany.mutateAsync({
        name:        data.name,
        description: data.description || null,
        logo_url:    data.logo_url    || null,
        billing_day: data.billing_day ?? undefined,
      });
      toast.success('Kompaniya yaratildi!');
      router.push(paths.dashboard.company.root);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Xato yuz berdi');
    }
  });

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Yangi kompaniya"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Kompaniyalar', href: paths.dashboard.company.root },
          { name: 'Yangi' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3, maxWidth: 600, width: '100%', mx: 'auto' }}>
        <Form methods={methods} onSubmit={onSubmit}>
          <Stack spacing={3}>
            <Field.Text name="name" label="Kompaniya nomi" slotProps={{ inputLabel: { shrink: true } }} />
            <Field.Text name="description" label="Tavsif" multiline rows={3} slotProps={{ inputLabel: { shrink: true } }} />
            <Field.ImageUpload name="logo_url" label="Logo" />
            <Field.BillingDayPicker name="billing_day" label="To'lov kuni" />

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button component={RouterLink} href={paths.dashboard.company.root} variant="outlined" color="inherit">
                Bekor qilish
              </Button>
              <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
                Yaratish
              </LoadingButton>
            </Box>
          </Stack>
        </Form>
      </Card>
    </DashboardContent>
  );
}
