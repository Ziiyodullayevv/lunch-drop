'use client';

import * as z from 'zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import LoadingButton from '@mui/lab/LoadingButton';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useCompany, useUpdateCompany } from '../hooks/use-companies';

// ----------------------------------------------------------------------

const Schema = z.object({
  name:        z.string().min(1, { message: 'Nomi majburiy' }),
  description: z.string().optional(),
  logo_url:    z.string().optional(),
  billing_day: z.number().min(1).max(31).nullable().optional(),
});

type FormValues = z.infer<typeof Schema>;

// ----------------------------------------------------------------------

type Props = { id: string };

export function CompanyEditView({ id }: Props) {
  const router = useRouter();

  const { data, isLoading } = useCompany(id);
  const updateCompany = useUpdateCompany(id);

  const methods = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: { name: '', description: '', logo_url: '', billing_day: null },
  });

  const { handleSubmit, reset, formState: { isSubmitting } } = methods;

  useEffect(() => {
    if (data) {
      reset({
        name:        data.name        ?? '',
        description: data.description ?? '',
        logo_url:    data.logo_url    ?? '',
        billing_day: data.billing_day != null ? Number(data.billing_day) : null,
      });
    }
  }, [data, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateCompany.mutateAsync({
        name:        values.name,
        description: values.description || null,
        logo_url:    values.logo_url    || null,
        billing_day: values.billing_day ?? undefined,
      });
      toast.success('Kompaniya yangilandi');
      router.push(paths.dashboard.company.root);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Xato yuz berdi');
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

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Kompaniyani tahrirlash"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Kompaniyalar', href: paths.dashboard.company.root },
          { name: 'Tahrirlash' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3, maxWidth: 600 }}>
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
                Saqlash
              </LoadingButton>
            </Box>
          </Stack>
        </Form>
      </Card>
    </DashboardContent>
  );
}
