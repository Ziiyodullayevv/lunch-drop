import type { Metadata } from 'next';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------

const CONTACT_EMAIL = 'akobirjsdev@gmail.com';
const SUPPORT_BOT = '@lunchdropuzbot';
const LAST_UPDATED = 'July 7, 2026';

export const metadata: Metadata = {
  title: `Account Deletion - ${CONFIG.appName}`,
  description: 'How Lunch Drop users can request account and associated data deletion.',
};

export default function Page() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 } }}>
      <Stack spacing={5}>
        <Box>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>
            Last updated: {LAST_UPDATED}
          </Typography>
          <Typography variant="h2" sx={{ mt: 1, mb: 2 }}>
            Account Deletion
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
            Lunch Drop users can request deletion of their account and personal data connected to
            the account by contacting support through Telegram or email.
          </Typography>
        </Box>

        <Stack spacing={2}>
          <Typography variant="h4">Hisobni o&apos;chirish so&apos;rovi</Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
            Hisobingizni va unga bog&apos;liq shaxsiy ma&apos;lumotlarni o&apos;chirish uchun
            Telegram support bot{' '}
            <Link href="https://t.me/lunchdropuzbot" target="_blank" rel="noopener">
              {SUPPORT_BOT}
            </Link>{' '}
            orqali yoki{' '}
            <Link href={`mailto:${CONTACT_EMAIL}?subject=Lunch%20Drop%20account%20deletion`}>
              {CONTACT_EMAIL}
            </Link>{' '}
            email manziliga murojaat qiling.
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
            So&apos;rovda Lunch Drop hisobingizga ulangan telefon raqamingizni va hisobni
            o&apos;chirishni xohlayotganingizni yozing. Xavfsizlik uchun hisob egasini
            tasdiqlashimiz mumkin.
          </Typography>
        </Stack>

        <Divider />

        <Stack spacing={2}>
          <Typography variant="h4">Account deletion request</Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
            To request deletion of your Lunch Drop account and associated personal data, contact us
            through Telegram support bot{' '}
            <Link href="https://t.me/lunchdropuzbot" target="_blank" rel="noopener">
              {SUPPORT_BOT}
            </Link>{' '}
            or send an email to{' '}
            <Link href={`mailto:${CONTACT_EMAIL}?subject=Lunch%20Drop%20account%20deletion`}>
              {CONTACT_EMAIL}
            </Link>
            .
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
            Include the phone number connected to your Lunch Drop account and state that you want to
            delete your account. We may ask you to verify account ownership before processing the
            request.
          </Typography>
        </Stack>

        <Divider />

        <Stack spacing={2}>
          <Typography variant="h4">What will be deleted</Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
            We will delete or anonymize account profile data, contact information, device or
            notification tokens, and personal data connected to your Lunch Drop account where
            deletion is technically and legally possible.
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
            Some records may be retained when required for legal, accounting, security, fraud
            prevention, dispute resolution, or business audit purposes. Retained data is kept only
            for as long as required for those purposes and is not used for marketing.
          </Typography>
        </Stack>
      </Stack>
    </Container>
  );
}
