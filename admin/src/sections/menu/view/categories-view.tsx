'use client';

import * as z from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useCategories, useCreateCategory } from '../hooks/use-meals';

// ----------------------------------------------------------------------

const Schema = z.object({
  name: z.string().min(1, { message: 'Nom kiritilishi shart' }),
});

type FormValues = z.infer<typeof Schema>;

// ----------------------------------------------------------------------

export function CategoriesView() {
  const [addOpen, setAddOpen] = useState(false);

  const { data: categories, isLoading: loading } = useCategories();
  const createCategory = useCreateCategory();

  const addMethods = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: { name: '' },
  });

  const onAddSubmit = addMethods.handleSubmit(async (data) => {
    try {
      await createCategory.mutateAsync(data.name);
      toast.success("Kategoriya qo'shildi");
      addMethods.reset();
      setAddOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    }
  });

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Kategoriyalar"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Menu', href: paths.dashboard.menu.root },
          { name: 'Kategoriyalar' },
        ]}
        action={
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={() => setAddOpen(true)}
          >
            Kategoriya qo'shish
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : !categories || categories.length === 0 ? (
        <Card sx={{ p: 5, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>Kategoriyalar yo'q</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Hali ovqat kategoriyalari qo'shilmagan
          </Typography>
          <Button variant="contained" onClick={() => setAddOpen(true)}>
            Birinchi kategoriyani qo'shish
          </Button>
        </Card>
      ) : (
        <Card>
          {categories.map((cat, idx) => (
            <Box key={cat.id}>
              {idx > 0 && <Divider />}
              <Stack
                direction="row"
                sx={{ px: 3, py: 2, alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 1.5,
                      bgcolor: 'primary.lighter',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Iconify icon="solar:cup-star-bold" width={24} sx={{ color: 'primary.main' }} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {cat.name}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      {cat.kitchen_id.slice(0, 8)}...
                    </Typography>
                  </Box>
                  <Chip label="Aktiv" color="success" size="small" variant="soft" />
                </Stack>
              </Stack>
            </Box>
          ))}
        </Card>
      )}

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Yangi kategoriya</DialogTitle>
        <Divider />
        <Form methods={addMethods} onSubmit={onAddSubmit}>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              <Field.Text
                name="name"
                label="Kategoriya nomi"
                placeholder="Masalan: Milliy taomlar"
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
          </DialogContent>
          <Divider />
          <DialogActions>
            <Button onClick={() => setAddOpen(false)} color="inherit">Bekor qilish</Button>
            <LoadingButton type="submit" variant="contained" loading={addMethods.formState.isSubmitting}>
              Qo'shish
            </LoadingButton>
          </DialogActions>
        </Form>
      </Dialog>
    </DashboardContent>
  );
}
