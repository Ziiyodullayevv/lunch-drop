'use client';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';

import axios from 'src/lib/axios';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

const Schema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  phone: z.string().min(1, { message: 'Phone is required' }),
});

type FormValues = z.infer<typeof Schema>;

// ----------------------------------------------------------------------

export function AccountGeneral() {
  const { user, checkUserSession } = useAuthContext();

  const methods = useForm<FormValues>({
    resolver: zodResolver(Schema),
    values: {
      name: user?.name ?? '',
      phone: user?.phone ?? '',
    },
  });

  const { handleSubmit, formState: { isSubmitting } } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      await axios.patch(`/api/v1/auth/me`, {
        name: data.name,
        phone: data.phone,
      });
      await checkUserSession?.();
      toast.success('Profil yangilandi!');
    } catch (err: any) {
      toast.error(err?.message ?? 'Xatolik yuz berdi');
    }
  });

  const initials = (user?.name ?? user?.phone ?? '?')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ pt: 6, pb: 5, px: 3, textAlign: 'center' }}>
            <Avatar
              sx={{
                mx: 'auto',
                width: 96,
                height: 96,
                fontSize: 32,
                fontWeight: 700,
                bgcolor: 'primary.main',
                mb: 2,
              }}
            >
              {initials}
            </Avatar>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {user?.name ?? '—'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.role?.replace('_', ' ')}
            </Typography>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ p: 3 }}>
            <Box
              sx={{
                rowGap: 3,
                columnGap: 2,
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
              }}
            >
              <Field.Text name="name" label="To'liq ism" slotProps={{ inputLabel: { shrink: true } }} />
              <Field.Phone name="phone" label="Telefon raqam" country="UZ" />
            </Box>

            <Stack sx={{ mt: 3, alignItems: 'flex-end' }}>
              <Button type="submit" variant="contained" loading={isSubmitting}>
                Saqlash
              </Button>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Form>
  );
}
