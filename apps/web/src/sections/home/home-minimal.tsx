import type { BoxProps } from '@mui/material/Box';

import { m } from 'framer-motion';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';
import { varFade, MotionViewport } from 'src/components/animate';

import { SectionTitle } from './components/section-title';
import { CircleSvg, FloatLine, FloatPlusIcon } from './components/svg-elements';

// ----------------------------------------------------------------------

const renderLines = () => (
  <>
    <FloatPlusIcon sx={{ top: 72, left: 72 }} />
    <FloatPlusIcon sx={{ bottom: 72, left: 72 }} />
    <FloatLine sx={{ top: 80, left: 0 }} />
    <FloatLine sx={{ bottom: 80, left: 0 }} />
    <FloatLine vertical sx={{ top: 0, left: 80 }} />
  </>
);

export function HomeMinimal({ sx, ...other }: BoxProps) {
  const renderDescription = () => (
    <>
      <SectionTitle
        caption="Bitta ekotizim"
        title="Har bir tomon uchun"
        txtGradient="qulay yechim"
        description="Lunch Drop korporativ ovqatlanishdagi barcha ishtirokchilarni bitta boshqaruv tizimida birlashtiradi."
        sx={{ mb: { xs: 5, md: 8 }, textAlign: { xs: 'center', md: 'left' } }}
      />

      <Stack spacing={5} sx={{ maxWidth: { sm: 600, md: 460 }, mx: { xs: 'auto', md: 'unset' } }}>
        {ITEMS.map((item) => (
          <Box
            component={m.div}
            variants={varFade('inUp', { distance: 24 })}
            key={item.title}
            sx={{ gap: 2.5, display: 'flex' }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                flexShrink: 0,
                display: 'flex',
                borderRadius: 1.5,
                alignItems: 'center',
                color: 'primary.main',
                justifyContent: 'center',
                bgcolor: (theme) => varAlpha(theme.vars.palette.primary.mainChannel, 0.08),
              }}
            >
              <Iconify width={28} icon={item.icon} />
            </Box>

            <Stack spacing={0.75}>
              <Typography variant="h5" component="h3">
                {item.title}
              </Typography>
              <Typography sx={{ color: 'text.secondary' }}>{item.description}</Typography>
            </Stack>
          </Box>
        ))}
      </Stack>
    </>
  );

  const renderImage = () => (
    <Stack
      component={m.div}
      variants={varFade('inRight', { distance: 24 })}
      sx={{
        height: 1,
        alignItems: 'center',
        position: 'relative',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={[
          (theme) => ({
            left: 0,
            width: 720,
            borderRadius: 2,
            position: 'absolute',
            bgcolor: 'background.default',
            boxShadow: `-40px 40px 80px 0px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.16)}`,
            ...theme.applyStyles('dark', {
              boxShadow: `-40px 40px 80px 0px ${varAlpha(theme.vars.palette.common.blackChannel, 0.16)}`,
            }),
          }),
        ]}
      >
        <Box
          component="img"
          alt="Lunch Drop boshqaruv paneli"
          src={`${CONFIG.assetsDir}/assets/images/home/home-chart.webp`}
          sx={{ width: 720 }}
        />
      </Box>
    </Stack>
  );

  return (
    <Box
      component="section"
      sx={[
        {
          overflow: 'hidden',
          position: 'relative',
          py: { xs: 10, md: 20 },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <MotionViewport>
        {renderLines()}

        <Container sx={{ position: 'relative' }}>
          <Grid container columnSpacing={{ xs: 0, md: 8 }} sx={{ position: 'relative', zIndex: 9 }}>
            <Grid size={{ xs: 12, md: 6, lg: 7 }}>{renderDescription()}</Grid>

            <Grid sx={{ display: { xs: 'none', md: 'block' } }} size={{ md: 6, lg: 5 }}>
              {renderImage()}
            </Grid>
          </Grid>

          <CircleSvg variants={varFade('in')} sx={{ display: { xs: 'none', md: 'block' } }} />
        </Container>
      </MotionViewport>
    </Box>
  );
}

// ----------------------------------------------------------------------

const ITEMS = [
  {
    title: 'Kompaniyalar uchun',
    description:
      'Filiallar va xodimlarni boshqaring, buyurtmalarni kuzating hamda korporativ ovqatlanish jarayonini shaffof nazorat qiling.',
    icon: 'solar:case-minimalistic-bold',
  },
  {
    title: 'Oshxonalar uchun',
    description:
      'Menyuni yangilang, kelgan buyurtmalarni qabul qiling, tayyorlash va yetkazib berish holatini real vaqt rejimida boshqaring.',
    icon: 'solar:tea-cup-bold',
  },
  {
    title: 'Xodimlar uchun mobil ilova',
    description:
      'Xodimlar qulay mobil ilovada menyuni ko‘radi, taom tanlaydi, buyurtma beradi va uning holatini kuzatadi.',
    icon: 'solar:smartphone-2-bold',
  },
] as const;
