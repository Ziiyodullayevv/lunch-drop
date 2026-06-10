'use client';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import axios, { endpoints } from 'src/lib/axios';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

// ----------------------------------------------------------------------

const Schema = z.object({
  phone: z.string().min(1, { message: 'Telefon kiritilishi shart' }),
  name: z.string().optional(),
  password: z.string().min(6, { message: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" }),
  branch_id: z.string().optional(),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof Schema>;
type Branch = { id: string; name: string };

export function EmployeeCreateForm() {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    axios.get(endpoints.superAdmin.branches).then((r) => setBranches(r.data)).catch(() => {});
  }, []);

  const methods = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      phone: '',
      name: '',
      password: '',
      branch_id: '',
      is_active: false,
    },
  });

  const { handleSubmit, watch, setValue, formState: { isSubmitting } } = methods;
  const isActive = watch('is_active');

  const onSubmit = handleSubmit(async (data) => {
    try {
      await axios.post(`/api/v1/super-admin/employees`, {
        phone: data.phone,
        name: data.name || null,
        password: data.password,
        status: data.is_active ? 'active' : 'pending',
        branch_id: data.branch_id || null,
      });
      toast.success('Xodim yaratildi!');
      router.push(paths.dashboard.employee.list);
    } catch (err: any) {
      toast.error(err?.message || 'Xatolik yuz berdi');
    }
  });

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ pt: 10, pb: 5, px: 3, textAlign: 'center' }}>
            <Box
              sx={{
                mx: 'auto',
                mb: 3,
                width: 144,
                height: 144,
                borderRadius: '50%',
                bgcolor: 'background.neutral',
                border: '1px dashed',
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
              }}
            >
              <Box
                component="img"
                src="/assets/icons/files/ic-img.svg"
                sx={{ width: 36, height: 36, opacity: 0.5 }}
                onError={(e: any) => { e.target.style.display = 'none'; }}
              />
              <Typography variant="caption" sx={{ color: 'text.disabled', px: 2 }}>
                Rasm yuklanmaydi
              </Typography>
            </Box>

            <Divider sx={{ mb: 3 }} />

            <Stack spacing={1} sx={{ textAlign: 'left', px: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={isActive}
                    onChange={(e) => setValue('is_active', e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="subtitle2">
                    {isActive ? 'Darhol faollashtirish' : 'Tasdiqlash kerak'}
                  </Typography>
                }
                labelPlacement="start"
                sx={{ justifyContent: 'space-between', ml: 0, width: '100%' }}
              />
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                O'chirilsa, siz tasdiqlaguningizcha xodim tizimga kira olmaydi
              </Typography>
            </Stack>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ p: 3 }}>
            <Box
              sx={{
                display: 'grid',
                columnGap: 2,
                rowGap: 3,
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              }}
            >
              <Field.Text
                name="name"
                label="To'liq ism"
                placeholder="Ism familiya"
                slotProps={{ inputLabel: { shrink: true } }}
              />

              <Field.Text
                name="password"
                label="Parol"
                type="password"
                placeholder="••••••"
                slotProps={{ inputLabel: { shrink: true } }}
              />

              <Box sx={{ gridColumn: { sm: 'span 2' } }}>
                <Field.Phone name="phone" label="Telefon raqami" country="UZ" />
              </Box>

              <Box sx={{ gridColumn: { sm: 'span 2' } }}>
                <Field.Select
                  name="branch_id"
                  label="Filial"
                  slotProps={{ inputLabel: { shrink: true } }}
                >
                  <MenuItem value="">— Tanlang —</MenuItem>
                  {branches.map((b) => (
                    <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                  ))}
                </Field.Select>
              </Box>
            </Box>

            <Stack sx={{ mt: 3, alignItems: 'flex-end' }}>
              <LoadingButton
                type="submit"
                variant="contained"
                loading={isSubmitting}
                size="large"
              >
                Xodim yaratish
              </LoadingButton>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Form>
  );
}
