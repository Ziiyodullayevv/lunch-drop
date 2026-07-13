'use client';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { useBoolean } from 'minimal-shared/hooks';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { uploadImage } from 'src/lib/api/uploads';
import { getImagePreviewUrl } from 'src/lib/image-url';
import { useTranslate } from 'src/locales/use-locales';
import {
  type AccountUser,
  fetchAccountProfile,
  type AccountProfile,
  updateAccountProfile,
} from 'src/lib/api/account';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { UploadAvatar } from 'src/components/upload';
import { Form, Field } from 'src/components/hook-form';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

const Schema = z
  .object({
    name: z.string().min(1, { message: 'Ism kiritilishi shart' }),
    password: z.string(),
    confirmPassword: z.string(),
  })
  .refine((value) => !value.password || value.password.length >= 6, {
    message: "Parol kamida 6 ta belgidan iborat bo'lishi kerak",
    path: ['password'],
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Parollar bir xil emas',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof Schema>;

const ROLE_COLORS: Record<
  AccountUser['role'],
  'error' | 'info' | 'success' | 'warning'
> = {
  super_admin: 'error',
  company_admin: 'info',
  kitchen_admin: 'warning',
  employee: 'success',
};

// ----------------------------------------------------------------------

export function AccountGeneral() {
  const { user, checkUserSession } = useAuthContext();
  const { t } = useTranslate('common');
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const showPassword = useBoolean();
  const accountUser = user as AccountUser | null;

  const methods = useForm<FormValues>({
    resolver: zodResolver(Schema),
    values: {
      name: profile?.name ?? '',
      password: '',
      confirmPassword: '',
    },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!accountUser) {
        if (active) setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      try {
        const nextProfile = await fetchAccountProfile();
        if (active) setProfile(nextProfile);
      } catch (err: unknown) {
        if (active) {
          toast.error(err instanceof Error ? err.message : t('accountPage.profileLoadError'));
        }
      } finally {
        if (active) setProfileLoading(false);
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, [accountUser]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      const updatedProfile = await updateAccountProfile({
        name: data.name.trim(),
        ...(data.password ? { password: data.password } : {}),
      });
      setProfile(updatedProfile);
      methods.reset({
        name: updatedProfile.name,
        password: '',
        confirmPassword: '',
      });
      await checkUserSession?.();
      toast.success(t('accountPage.profileUpdated'));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    }
  });

  const handleAvatarDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setAvatarUploading(true);
    try {
      const { url } = await uploadImage(file, 'avatars');
      const updatedProfile = await updateAccountProfile({ avatar_url: url });
      setProfile(updatedProfile);
      await checkUserSession?.();
      toast.success(t('accountPage.avatarUpdated'));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('accountPage.avatarError'));
    } finally {
      setAvatarUploading(false);
    }
  };

  if (profileLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card
            sx={{
              pt: 4,
              pb: 3,
              px: 3,
              textAlign: 'center',
              position: 'relative',
            }}
          >
            <Chip
              label={profile?.accountStatus === 'approved' ? t('user.statuses.approved') : t('user.statuses.pending_approval')}
              color={profile?.accountStatus === 'approved' ? 'success' : 'warning'}
              variant="soft"
              sx={{
                top: 24,
                right: 24,
                height: 28,
                fontSize: 12,
                fontWeight: 700,
                position: 'absolute',
                '& .MuiChip-label': { px: 1.25 },
              }}
            />

            <Box sx={{ mt: 6 }}>
              <UploadAvatar
                value={profile?.avatarUrl ? getImagePreviewUrl(profile.avatarUrl) : null}
                loading={avatarUploading}
                onDrop={handleAvatarDrop}
                maxSize={3 * 1024 * 1024}
              />
            </Box>

            <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 2 }}>
              {t('accountPage.allowedFormats')}
              <br />
              {t('accountPage.maxSize')}
            </Typography>

            <Stack spacing={1.25} sx={{ mt: 3.5, alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {profile?.name || accountUser?.name || '—'}
              </Typography>
              {profile?.role && (
                <Chip
                  label={t(`user.roles.${profile.role}`)}
                  color={ROLE_COLORS[profile.role]}
                  variant="soft"
                  sx={{
                    height: 28,
                    fontSize: 12,
                    fontWeight: 700,
                    '& .MuiChip-label': { px: 1.25 },
                  }}
                />
              )}
            </Stack>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ p: { xs: 2.5, md: 4 } }}>
            <Box
              sx={{
                rowGap: 3,
                columnGap: 2,
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
              }}
            >
              <Field.Text
                name="name"
                label={t('accountPage.fullName')}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label={t('accountPage.phone')}
                value={profile?.phone ?? accountUser?.phone ?? ''}
                disabled
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label={t('accountPage.role')}
                value={profile?.role ? t(`user.roles.${profile.role}`) : ''}
                disabled
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label={t('accountPage.status')}
                value={profile?.isActive ? t('user.statuses.approved') : t('user.statuses.inactive')}
                disabled
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <Field.Text
                name="password"
                label={t('accountPage.newPassword')}
                type={showPassword.value ? 'text' : 'password'}
                slotProps={{
                  inputLabel: { shrink: true },
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={showPassword.onToggle} edge="end">
                          <Iconify
                            icon={
                              showPassword.value
                                ? 'solar:eye-bold'
                                : 'solar:eye-closed-bold'
                            }
                          />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <Field.Text
                name="confirmPassword"
                label={t('accountPage.confirmPassword')}
                type={showPassword.value ? 'text' : 'password'}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>

            <Stack sx={{ mt: 4, alignItems: 'flex-end' }}>
              <Button type="submit" variant="contained" size="large" loading={isSubmitting}>
                {t('accountPage.save')}
              </Button>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Form>
  );
}
