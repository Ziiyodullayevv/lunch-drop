import type { Metadata } from 'next';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/global-config';

const CONTACT_EMAIL = 'akobirjsdev@gmail.com';
const LAST_UPDATED = 'July 11, 2026';

export const metadata: Metadata = {
  title: `Foydalanish shartlari - ${CONFIG.appName}`,
  description: 'Lunch Drop mobil ilovasi va admin panelidan foydalanish shartlari.',
};

const sections = [
  {
    title: 'Xizmatdan foydalanish',
    body: "Lunch Drop kompaniya xodimlari, kompaniya adminlari va oshxonalar o‘rtasida taom buyurtmalarini boshqarish uchun xizmat qiladi. Ilovadan qonuniy va belgilangan maqsadlarda foydalanishingiz kerak.",
  },
  {
    title: 'Hisob xavfsizligi',
    body: "Telefon raqamingiz, Telegram tasdiqlash kodingiz va parolingiz xavfsizligini saqlash uchun siz javobgarsiz. Boshqa shaxsning hisobidan ruxsatsiz foydalanish taqiqlanadi.",
  },
  {
    title: 'Buyurtmalar va to‘lovlar',
    body: "Buyurtma narxi, qabul qilish va yetkazish vaqti ilovada ko‘rsatiladi. Kompaniya, filial yoki oshxona tomonidan belgilangan hisob-kitob va bekor qilish qoidalari buyurtmaga tatbiq etiladi.",
  },
  {
    title: 'Maqbul foydalanish',
    body: "Xizmatga zarar yetkazish, noto‘g‘ri ma’lumot kiritish, boshqa foydalanuvchilar huquqlarini buzish yoki tizim xavfsizligini chetlab o‘tishga urinish mumkin emas.",
  },
  {
    title: 'Xizmatdagi o‘zgarishlar',
    body: "Lunch Drop xavfsizlik, texnik xizmat yoki mahsulotni rivojlantirish sababli ayrim funksiyalarni yangilashi yoki vaqtincha cheklashi mumkin.",
  },
  {
    title: 'Hisobni cheklash yoki yopish',
    body: "Ushbu shartlar buzilsa yoki hisob xavfsizligiga tahdid aniqlansa, hisob vaqtincha cheklanishi yoki o‘chirilishi mumkin. Foydalanuvchi support orqali hisobini o‘chirishni so‘rashi mumkin.",
  },
];

export default function Page() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 } }}>
      <Stack spacing={5}>
        <Box>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>
            Oxirgi yangilanish: {LAST_UPDATED}
          </Typography>
          <Typography variant="h2" sx={{ mt: 1, mb: 2 }}>
            Foydalanish shartlari
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
            Lunch Drop mobil ilovasi yoki admin panelidan foydalanish orqali ushbu shartlarga
            rozilik bildirasiz.
          </Typography>
        </Box>

        <Stack spacing={3}>
          {sections.map((section) => (
            <Stack key={section.title} spacing={1.5}>
              <Typography variant="h6">{section.title}</Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
                {section.body}
              </Typography>
            </Stack>
          ))}
        </Stack>

        <Divider />

        <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
          Savollar uchun Telegram support bot yoki{' '}
          <Link href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</Link> orqali murojaat qiling.
        </Typography>
      </Stack>
    </Container>
  );
}
