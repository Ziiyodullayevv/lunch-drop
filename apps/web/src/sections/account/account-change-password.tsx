import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { useBoolean } from 'minimal-shared/hooks';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';

import { updateAccountProfile } from 'src/lib/api/account';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

// ----------------------------------------------------------------------

export type ChangePassWordSchemaType = z.infer<typeof ChangePassWordSchema>;

export const ChangePassWordSchema = z
  .object({
    newPassword: z
      .string()
      .min(1, { error: 'Yangi parol kiritilishi shart' })
      .min(6, { error: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" }),
    confirmNewPassword: z.string().min(1, { error: 'Parolni tasdiqlang' }),
  })
  .refine((val) => val.newPassword === val.confirmNewPassword, {
    error: 'Parollar bir xil emas',
    path: ['confirmNewPassword'],
  });

// ----------------------------------------------------------------------

export function AccountChangePassword() {
  const showPassword = useBoolean();

  const defaultValues: ChangePassWordSchemaType = {
    newPassword: '',
    confirmNewPassword: '',
  };

  const methods = useForm({
    mode: 'all',
    resolver: zodResolver(ChangePassWordSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      await updateAccountProfile({ password: data.newPassword });
      reset();
      toast.success('Parol yangilandi!');
    } catch (err: any) {
      toast.error(err?.message ?? 'Xatolik yuz berdi');
    }
  });

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Card
        sx={{
          p: 3,
          gap: 3,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Field.Text
          name="newPassword"
          label="Yangi parol"
          type={showPassword.value ? 'text' : 'password'}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={showPassword.onToggle} edge="end">
                    <Iconify
                      icon={showPassword.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'}
                    />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
          helperText={
            <Box component="span" sx={{ gap: 0.5, display: 'flex', alignItems: 'center' }}>
              <Iconify icon="solar:info-circle-bold" width={16} /> Kamida 6 ta belgi
            </Box>
          }
        />

        <Field.Text
          name="confirmNewPassword"
          type={showPassword.value ? 'text' : 'password'}
          label="Yangi parolni tasdiqlang"
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={showPassword.onToggle} edge="end">
                    <Iconify
                      icon={showPassword.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'}
                    />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />

        <Button type="submit" variant="contained" loading={isSubmitting} sx={{ ml: 'auto' }}>
          Saqlash
        </Button>
      </Card>
    </Form>
  );
}
