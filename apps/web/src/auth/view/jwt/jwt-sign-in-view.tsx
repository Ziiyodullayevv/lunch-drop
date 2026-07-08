'use client';

import * as z from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useBoolean } from 'minimal-shared/hooks';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

import { useAuthContext } from '../../hooks';
import { getErrorMessage } from '../../utils';
import { FormHead } from '../../components/form-head';
import { signInWithPassword } from '../../context/jwt';

// ----------------------------------------------------------------------

export type SignInSchemaType = z.infer<typeof SignInSchema>;

export const SignInSchema = z.object({
  phone: z.string().min(1, { message: 'Telefon raqam majburiy' }),
  password: z
    .string()
    .min(1, { message: 'Parol majburiy' })
    .min(6, { message: 'Parol kamida 6 ta belgidan iborat bo‘lishi kerak' }),
});

// ----------------------------------------------------------------------

export function JwtSignInView() {
  const router = useRouter();
  const showPassword = useBoolean();
  const { checkUserSession } = useAuthContext();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const methods = useForm({
    resolver: zodResolver(SignInSchema),
    defaultValues: { phone: '', password: '' },
  });

  const { handleSubmit, formState: { isSubmitting } } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      await signInWithPassword({ phone: data.phone, password: data.password });
      await checkUserSession?.();
      router.push(paths.dashboard.root);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  });

  return (
    <>
      <FormHead
        title="Tizimga kirish"
        description={
          <>
            Lunch Drop hamkori bo‘lmoqchimisiz?{' '}
            <Link component={RouterLink} href={paths.auth.jwt.signUp} variant="subtitle2">
              Ro‘yxatdan o‘tish
            </Link>
          </>
        }
        sx={{ textAlign: { xs: 'center', md: 'left' } }}
      />

      {!!errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      <Form methods={methods} onSubmit={onSubmit}>
        <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
          <Field.Phone name="phone" label="Telefon raqam" country="UZ" />

          <Field.Text
            name="password"
            label="Parol"
            placeholder="Kamida 6 ta belgi"
            type={showPassword.value ? 'text' : 'password'}
            slotProps={{
              inputLabel: { shrink: true },
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

          <Button
            fullWidth
            color="inherit"
            size="large"
            type="submit"
            variant="contained"
            loading={isSubmitting}
            loadingIndicator="Kirilmoqda..."
          >
            Kirish
          </Button>
        </Box>
      </Form>
    </>
  );
}
