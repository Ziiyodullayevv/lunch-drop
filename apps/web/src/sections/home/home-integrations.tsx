import type { BoxProps } from '@mui/material/Box';

import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/global-config';
import { useTranslate } from 'src/locales';

import { varFade, varScale, MotionViewport } from 'src/components/animate';

import { SectionTitle } from './components/section-title';
import { FloatLine, FloatDotIcon } from './components/svg-elements';

// ----------------------------------------------------------------------

const renderLines = () => (
  <>
    <Stack
      spacing={8}
      sx={{
        top: 64,
        left: 80,
        zIndex: 2,
        bottom: 64,
        alignItems: 'center',
        position: 'absolute',
        transform: 'translateX(-50%)',
        '& span': { position: 'static', opacity: 0.12 },
      }}
    >
      <FloatDotIcon />
      <FloatDotIcon sx={{ opacity: 0.24, width: 14, height: 14 }} />
      <Box sx={{ flexGrow: 1 }} />
      <FloatDotIcon sx={{ opacity: 0.24, width: 14, height: 14 }} />
      <FloatDotIcon />
    </Stack>

    <FloatLine vertical sx={{ top: 0, left: 80 }} />
  </>
);

export function HomeIntegrations({ sx, ...other }: BoxProps) {
  const { t } = useTranslate();
  const steps = [0, 1, 2].map((index) => ({
    title: t(`home.workflow.steps.${index}.title`),
    description: t(`home.workflow.steps.${index}.description`),
  }));
  const renderDescription = () => (
    <Stack spacing={5}>
      <SectionTitle
        caption={t('home.workflow.caption')}
        title={t('home.workflow.title')}
        txtGradient={t('home.workflow.gradient')}
        description={t('home.workflow.description')}
        sx={{ textAlign: { xs: 'center', md: 'left' } }}
      />

      <Stack spacing={3}>
        {steps.map((step, index) => (
          <Stack
            key={step.title}
            component={m.div}
            variants={varFade('inUp', { distance: 24 })}
            direction="row"
            spacing={2}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                flexShrink: 0,
                display: 'flex',
                borderRadius: '50%',
                alignItems: 'center',
                color: 'primary.contrastText',
                bgcolor: 'primary.main',
                justifyContent: 'center',
                typography: 'subtitle2',
              }}
            >
              {index + 1}
            </Box>

            <Box>
              <Typography variant="h6">{step.title}</Typography>
              <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                {step.description}
              </Typography>
            </Box>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );

  const renderImage = () => (
    <Box sx={{ position: 'relative' }}>
      <Box
        component={m.img}
        variants={{ ...varScale('in'), initial: { scale: 0.8, opacity: 0 } }}
        alt={t('home.workflow.imageAlt')}
        src={`${CONFIG.assetsDir}/assets/illustrations/illustration-integration.webp`}
        sx={{ width: 720, objectFit: 'cover', aspectRatio: '1/1' }}
      />

    </Box>
  );

  return (
    <Box
      component="section"
      sx={[{ py: { xs: 10, md: 15 }, position: 'relative' }, ...(Array.isArray(sx) ? sx : [sx])]}
      {...other}
    >
      <MotionViewport>
        {renderLines()}

        <Container>
          <Grid container spacing={{ xs: 8, md: 10 }} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, md: 6, lg: 5 }}>{renderDescription()}</Grid>

            <Grid sx={{ textAlign: { xs: 'center', md: 'right' } }} size={{ xs: 12, md: 6, lg: 7 }}>
              {renderImage()}
            </Grid>
          </Grid>
        </Container>
      </MotionViewport>
    </Box>
  );
}
