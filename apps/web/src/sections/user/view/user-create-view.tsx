'use client';

import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

export function UserCreateView() {
  const handleCopyRegistrationLink = async () => {
    const registrationUrl = `${window.location.origin}${paths.auth.jwt.signUp}`;

    try {
      await navigator.clipboard.writeText(registrationUrl);
      toast.success("Ro'yxatdan o'tish havolasi nusxalandi");
    } catch {
      toast.error("Havolani nusxalab bo'lmadi");
    }
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Yangi admin qo'shish"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Foydalanuvchilar', href: paths.dashboard.user.list },
          { name: "Admin qo'shish" },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: { xs: 3, md: 5 }, maxWidth: 760, mx: 'auto' }}>
        <Stack spacing={3}>
          <Alert severity="info">
            Super admin uchun foydalanuvchini telefon va parol bilan to&apos;g&apos;ridan-to&apos;g&apos;ri
            yaratish endpointi mavjud emas. Admin akkaunti OTP orqali ro&apos;yxatdan o&apos;tadi.
          </Alert>

          <Stack spacing={2}>
            <Typography variant="h6">Admin onboarding tartibi</Typography>

            <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
              <Typography variant="subtitle1">1.</Typography>
              <Typography variant="body2" color="text.secondary">
                Ro&apos;yxatdan o&apos;tish havolasini yangi kitchen yoki company admin nomzodiga
                yuboring.
              </Typography>
            </Stack>

            <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
              <Typography variant="subtitle1">2.</Typography>
              <Typography variant="body2" color="text.secondary">
                U telefon raqamini OTP bilan tasdiqlaydi va o&apos;z parolini o&apos;rnatadi.
              </Typography>
            </Stack>

            <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
              <Typography variant="subtitle1">3.</Typography>
              <Typography variant="body2" color="text.secondary">
                Ariza Foydalanuvchilar bo&apos;limidagi Kutmoqda holatida paydo bo&apos;ladi.
                Super admin uni tasdiqlaydi.
              </Typography>
            </Stack>

            <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
              <Typography variant="subtitle1">4.</Typography>
              <Typography variant="body2" color="text.secondary">
                Mavjud oshxonaga biriktirish kerak bo&apos;lsa, userni tahrirlab Oshxona
                maydonidan kerakli oshxonani tanlang.
              </Typography>
            </Stack>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              variant="contained"
              startIcon={<Iconify icon="solar:copy-bold" />}
              onClick={handleCopyRegistrationLink}
            >
              Ro&apos;yxatdan o&apos;tish havolasini nusxalash
            </Button>

            <Button
              component={RouterLink}
              href={`${paths.dashboard.user.list}?status=pending_approval`}
              variant="outlined"
              color="inherit"
            >
              Kutilayotgan arizalarni ko&apos;rish
            </Button>
          </Stack>

          <Alert severity="warning">
            Super adminning o&apos;zi telefon, parol va mavjud oshxonani tanlab bitta amalda
            user yaratishi kerak bo&apos;lsa, backendga alohida create-user endpointi
            qo&apos;shilishi zarur.
          </Alert>
        </Stack>
      </Card>
    </DashboardContent>
  );
}
