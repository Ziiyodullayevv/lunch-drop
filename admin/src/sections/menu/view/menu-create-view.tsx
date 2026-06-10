'use client';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useCreateMeal, useCategories } from '../hooks/use-meals';

// ----------------------------------------------------------------------

export const MealCreateSchema = z.object({
  name:        z.string().min(1, { message: 'Nomi majburiy' }),
  description: z.string().optional(),
  price:       z.string().min(1, { message: 'Narxi majburiy' }),
  image_url:   z.string().optional(),
  category_id: z.string().optional(),
});

type FormValues = z.infer<typeof MealCreateSchema>;

const _defaultValues: FormValues = {
  name: '', description: '', price: '', image_url: '', category_id: '',
};

// ----------------------------------------------------------------------

export function MenuCreateView() {
  const router = useRouter();
  const createMeal = useCreateMeal();
  const { data: categoriesData } = useCategories();

  const categories = (categoriesData ?? []).map((c) => ({ id: c.id, name: c.name }));

  const methods = useForm<FormValues>({
    resolver: zodResolver(MealCreateSchema),
    defaultValues: _defaultValues,
  });

  const { handleSubmit, formState: { isSubmitting } } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      await createMeal.mutateAsync({
        name:        data.name,
        description: data.description || null,
        price:       parseFloat(data.price),
        image_url:   data.image_url   || null,
        category_id: data.category_id || null,
      });
      toast.success("Taom qo'shildi!");
      router.push(paths.dashboard.menu.root);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    }
  });

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Taom qo'shish"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Menyu', href: paths.dashboard.menu.root },
          { name: "Qo'shish" },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3, maxWidth: 700, width: '100%', mx: 'auto' }}>
        <Form methods={methods} onSubmit={onSubmit}>
          <Stack spacing={3}>
            <Field.Text
              name="name"
              label="Nomi"
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <Field.Text
              name="description"
              label="Tavsif"
              multiline
              rows={3}
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <Stack direction="row" spacing={2}>
              <Field.Text
                name="price"
                label="Narxi (so'm)"
                placeholder="25000"
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ flex: 1 }}
              />
              <Field.Select
                name="category_id"
                label="Kategoriya"
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ flex: 1 }}
              >
                <MenuItem value="">— Tanlanmagan —</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Field.Select>
            </Stack>

            <Field.ImageUpload name="image_url" label="Rasm" />

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                component={RouterLink}
                href={paths.dashboard.menu.root}
                variant="outlined"
                color="inherit"
              >
                Bekor qilish
              </Button>
              <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
                Qo'shish
              </LoadingButton>
            </Box>
          </Stack>
        </Form>
      </Card>
    </DashboardContent>
  );
}
