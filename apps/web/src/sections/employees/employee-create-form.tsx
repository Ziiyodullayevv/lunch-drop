'use client';

import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

// ----------------------------------------------------------------------

export function EmployeeCreateForm() {
  return (
    <Card sx={{ p: { xs: 3, md: 5 }, maxWidth: 760, mx: 'auto' }}>
      <Stack spacing={3}>
        <Alert severity="info">
          Company admin uchun xodimni telefon va parol bilan to&apos;g&apos;ridan-to&apos;g&apos;ri
          yaratish endpointi mavjud emas. Xodim mobil ilova orqali OTP bilan ro&apos;yxatdan
          o&apos;tadi.
        </Alert>

        <Stack spacing={2}>
          <Typography variant="h6">Xodim onboarding tartibi</Typography>

          <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
            <Typography variant="subtitle1">1.</Typography>
            <Typography variant="body2" color="text.secondary">
              Xodim mobil ilovada telefon raqamini kiritib OTP bilan tizimga kiradi.
            </Typography>
          </Stack>

          <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
            <Typography variant="subtitle1">2.</Typography>
            <Typography variant="body2" color="text.secondary">
              Kompaniya va kerakli filiallarni tanlab qo&apos;shilish so&apos;rovini yuboradi.
            </Typography>
          </Stack>

          <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
            <Typography variant="subtitle1">3.</Typography>
            <Typography variant="body2" color="text.secondary">
              So&apos;rov Xodimlar bo&apos;limida Kutmoqda holatida paydo bo&apos;ladi.
            </Typography>
          </Stack>

          <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
            <Typography variant="subtitle1">4.</Typography>
            <Typography variant="body2" color="text.secondary">
              Company admin so&apos;rovni tasdiqlagach, xodim filial menyusi va
              buyurtmalaridan foydalana oladi.
            </Typography>
          </Stack>
        </Stack>

        <Button
          component={RouterLink}
          href={paths.dashboard.employee.list}
          variant="contained"
          sx={{ alignSelf: 'flex-start' }}
        >
          Xodimlar ro&apos;yxatiga qaytish
        </Button>

        <Alert severity="warning">
          Company admin xodimni o&apos;zi yaratishi kerak bo&apos;lsa, backendga alohida
          employee create endpointi qo&apos;shilishi zarur.
        </Alert>
      </Stack>
    </Card>
  );
}
