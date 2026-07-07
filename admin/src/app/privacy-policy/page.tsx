import type { Metadata } from 'next';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------

const CONTACT_EMAIL = 'akobirjsdev@gmail.com';
const SUPPORT_BOT = '@lunchdropuzbot';
const LAST_UPDATED = 'July 5, 2026';

export const metadata: Metadata = {
  title: `Privacy Policy - ${CONFIG.appName}`,
  description: 'Lunch Drop privacy policy for mobile app users and admin users.',
};

const uzSections = [
  {
    title: "Biz qanday ma'lumotlarni yig'amiz",
    body: "Lunch Drop telefon raqamingiz, ism va familiyangiz, profil rasmingiz, kompaniya va filial ma'lumotlari, buyurtmalar tarixi, bildirishnoma/device tokenlari hamda admin panel foydalanuvchi ma'lumotlarini saqlashi mumkin.",
  },
  {
    title: "Ma'lumotlar nima uchun ishlatiladi",
    body: "Ma'lumotlar login qilish, foydalanuvchini kompaniya yoki filialga biriktirish, taom va buyurtmalarni boshqarish, bildirishnomalar yuborish, yordam ko'rsatish, xavfsizlikni ta'minlash va servis sifatini yaxshilash uchun ishlatiladi.",
  },
  {
    title: "Ma'lumotlar kimlar bilan ulashiladi",
    body: "Kerak bo'lganda ma'lumotlar kompaniya adminlari, filial yoki oshxona adminlari, backend/cloud xizmatlari va texnik support jarayonlari bilan ulashilishi mumkin. Biz shaxsiy ma'lumotlarni marketing maqsadida sotmaymiz.",
  },
  {
    title: "Ma'lumotlarni saqlash va o'chirish",
    body: "Ma'lumotlar servis ishlashi uchun kerak bo'lgan muddat davomida saqlanadi. Account yoki shaxsiy ma'lumotlarni o'chirishni account deletion sahifasi, Telegram bot yoki email orqali so'rashingiz mumkin.",
  },
  {
    title: 'Xavfsizlik',
    body: "Ma'lumotlarni himoya qilish uchun texnik va tashkiliy choralar qo'llanadi. Shunga qaramay, internet orqali uzatiladigan ma'lumotlar uchun mutlaq xavfsizlik kafolatlanmaydi.",
  },
];

const enSections = [
  {
    title: 'Information we collect',
    body: 'Lunch Drop may collect and process your phone number, full name, profile photo, company and branch information, order history, notification/device tokens, and admin panel user information.',
  },
  {
    title: 'How we use information',
    body: 'We use this information to sign users in, connect users to a company or branch, manage meals and orders, send notifications, provide support, protect the service, and improve service quality.',
  },
  {
    title: 'Sharing information',
    body: 'Information may be shared with company admins, branch or kitchen admins, backend/cloud service providers, and support workflows when needed to operate Lunch Drop. We do not sell personal information for marketing purposes.',
  },
  {
    title: 'Retention and deletion',
    body: 'Information is retained while it is needed to operate the service. You can request account or personal data deletion through the account deletion page, Telegram support bot, or email.',
  },
  {
    title: 'Security',
    body: 'We use technical and organizational measures to protect information. However, no method of transmission over the internet can be guaranteed to be fully secure.',
  },
];

function PolicySection({ title, body }: { title: string; body: string }) {
  return (
    <Stack spacing={1.5}>
      <Typography variant="h6">{title}</Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
        {body}
      </Typography>
    </Stack>
  );
}

export default function Page() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 } }}>
      <Stack spacing={5}>
        <Box>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>
            Last updated: {LAST_UPDATED}
          </Typography>
          <Typography variant="h2" sx={{ mt: 1, mb: 2 }}>
            Privacy Policy
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
            This privacy policy explains how Lunch Drop collects, uses, stores, and protects
            information in the Lunch Drop mobile app and admin panel.
          </Typography>
        </Box>

        <Stack spacing={3}>
          <Typography variant="h4">Maxfiylik siyosati</Typography>
          {uzSections.map((section) => (
            <PolicySection key={section.title} title={section.title} body={section.body} />
          ))}
        </Stack>

        <Divider />

        <Stack spacing={3}>
          <Typography variant="h4">Privacy Policy</Typography>
          {enSections.map((section) => (
            <PolicySection key={section.title} title={section.title} body={section.body} />
          ))}
        </Stack>

        <Divider />

        <Stack spacing={1.5}>
          <Typography variant="h5">Contact</Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
            For privacy questions or deletion requests, use the{' '}
            <Link href={paths.accountDeletion}>account deletion page</Link>, contact us by Telegram
            support bot{' '}
            <Link href="https://t.me/lunchdropuzbot" target="_blank" rel="noopener">
              {SUPPORT_BOT}
            </Link>{' '}
            or email{' '}
            <Link href={`mailto:${CONTACT_EMAIL}`} target="_blank" rel="noopener">
              {CONTACT_EMAIL}
            </Link>
            .
          </Typography>
        </Stack>
      </Stack>
    </Container>
  );
}
