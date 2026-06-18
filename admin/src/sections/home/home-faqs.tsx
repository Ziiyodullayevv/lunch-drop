import type { BoxProps } from '@mui/material/Box';

import { useState } from 'react';
import { m } from 'framer-motion';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Accordion, { accordionClasses } from '@mui/material/Accordion';

import { Iconify } from 'src/components/iconify';
import { varFade, MotionViewport } from 'src/components/animate';

import { SectionTitle } from './components/section-title';
import { FloatLine, FloatPlusIcon, FloatTriangleDownIcon } from './components/svg-elements';

// ----------------------------------------------------------------------

const FAQs = [
  {
    question: 'Lunch Drop kimlar uchun mo‘ljallangan?',
    answer: (
      <Typography>
        Platforma xodimlarini ovqat bilan ta’minlaydigan kompaniyalar, korporativ buyurtmalarni
        qabul qiluvchi oshxonalar va mobil ilova orqali taom tanlaydigan xodimlar uchun yaratilgan.
      </Typography>
    ),
  },
  {
    question: 'Kompaniya platformada nimalarni boshqara oladi?',
    answer: (
      <Typography>
        Kompaniya filiallar va xodimlarni qo‘shadi, oshxonalarni biriktiradi, buyurtmalarni kuzatadi
        va korporativ ovqatlanish jarayonini yagona boshqaruv panelidan nazorat qiladi.
      </Typography>
    ),
  },
  {
    question: 'Oshxona buyurtmalar bilan qanday ishlaydi?',
    answer: (
      <Typography>
        Oshxona menyu va taomlarni boshqaradi, kompaniyalardan kelgan buyurtmalarni qabul qiladi,
        ularni tayyorlash bo‘yicha jamlaydi hamda buyurtma holatini bosqichma-bosqich yangilaydi.
      </Typography>
    ),
  },
  {
    question: 'Xodimlar uchun mobil ilova qanday imkoniyat beradi?',
    answer: (
      <Typography>
        Xodim o‘z kompaniyasi uchun mavjud oshxona va menyularni ko‘radi, taom tanlaydi, buyurtma
        beradi, faol buyurtma holatini kuzatadi va buyurtmalar tarixidan foydalanadi.
      </Typography>
    ),
  },
  {
    question: 'Buyurtma holati barcha tomonlarga ko‘rinadimi?',
    answer: (
      <Typography>
        Ha. Buyurtmaning qabul qilinishi, tayyorlanishi va keyingi holatlari tizimda yangilanadi.
        Shu orqali kompaniya, oshxona va xodim jarayonning qaysi bosqichda ekanini kuzata oladi.
      </Typography>
    ),
  },
];

// ----------------------------------------------------------------------

export function HomeFAQs({ sx, ...other }: BoxProps) {
  const [expanded, setExpanded] = useState<string | false>(FAQs[0].question);

  const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const renderDescription = () => (
    <SectionTitle
      caption="Ko‘p so‘raladigan savollar"
      title="Muhim savollarga"
      txtGradient="aniq javoblar"
      sx={{ textAlign: 'center' }}
    />
  );

  const renderContent = () => (
    <Box
      sx={[
        {
          mt: 8,
          gap: 1,
          mx: 'auto',
          maxWidth: 720,
          display: 'flex',
          mb: { xs: 5, md: 8 },
          flexDirection: 'column',
        },
      ]}
    >
      {FAQs.map((item, index) => (
        <Accordion
          key={item.question}
          disableGutters
          component={m.div}
          variants={varFade('inUp', { distance: 24 })}
          expanded={expanded === item.question}
          onChange={handleChange(item.question)}
          sx={(theme) => ({
            transition: theme.transitions.create(['background-color'], {
              duration: theme.transitions.duration.shorter,
            }),
            py: 1,
            px: 2.5,
            border: 'none',
            borderRadius: 2,
            '&:hover': {
              bgcolor: varAlpha(theme.vars.palette.grey['500Channel'], 0.08),
            },
            [`&.${accordionClasses.expanded}`]: {
              bgcolor: varAlpha(theme.vars.palette.grey['500Channel'], 0.08),
            },
          })}
        >
          <AccordionSummary
            id={`home-faqs-panel${index}-header`}
            aria-controls={`home-faqs-panel${index}-content`}
          >
            <Typography component="span" variant="h6">
              {item.question}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>{item.answer}</AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );

  const renderContact = () => (
    <Box
      sx={[
        (theme) => ({
          px: 3,
          py: 8,
          textAlign: 'center',
          background: `linear-gradient(to left, ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}, transparent)`,
        }),
      ]}
    >
      <m.div variants={varFade('in')}>
        <Typography variant="h4">Lunch Drop bilan ishlashni boshlang</Typography>
      </m.div>

      <m.div variants={varFade('in')}>
        <Typography sx={{ mt: 2, mb: 3, color: 'text.secondary' }}>
          Kompaniya yoki oshxona sifatida tizimga kiring va korporativ ovqatlanishni bitta joydan
          boshqaring.
        </Typography>
      </m.div>

      <m.div variants={varFade('in')}>
        <Button
          color="inherit"
          variant="contained"
          href="/dashboard"
          startIcon={<Iconify icon="solar:inbox-in-bold-duotone" />}
        >
          Boshqaruv paneliga kirish
        </Button>
      </m.div>
    </Box>
  );

  return (
    <Box component="section" sx={sx} {...other}>
      <MotionViewport sx={{ py: 10, position: 'relative' }}>
        {topLines()}

        <Container>
          {renderDescription()}
          {renderContent()}
        </Container>

        <Stack sx={{ position: 'relative' }}>
          {bottomLines()}
          {renderContact()}
        </Stack>
      </MotionViewport>
    </Box>
  );
}

// ----------------------------------------------------------------------

const topLines = () => (
  <>
    <Stack
      spacing={8}
      sx={{
        top: 64,
        left: 80,
        alignItems: 'center',
        position: 'absolute',
        transform: 'translateX(-50%)',
      }}
    >
      <FloatTriangleDownIcon sx={{ position: 'static', opacity: 0.12 }} />
      <FloatTriangleDownIcon
        sx={{
          width: 30,
          height: 15,
          opacity: 0.24,
          position: 'static',
        }}
      />
    </Stack>

    <FloatLine vertical sx={{ top: 0, left: 80 }} />
  </>
);

const bottomLines = () => (
  <>
    <FloatLine sx={{ top: 0, left: 0 }} />
    <FloatLine sx={{ bottom: 0, left: 0 }} />
    <FloatPlusIcon sx={{ top: -8, left: 72 }} />
    <FloatPlusIcon sx={{ bottom: -8, left: 72 }} />
  </>
);
