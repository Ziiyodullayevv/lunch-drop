import { config } from '@tamagui/config';
import { createFont, createTamagui } from 'tamagui';

const nunitoSansFont = createFont({
  family: 'NunitoSans_400Regular',
  face: {
    400: { normal: 'NunitoSans_400Regular' },
    500: { normal: 'NunitoSans_500Medium' },
    600: { normal: 'NunitoSans_600SemiBold' },
    700: { normal: 'NunitoSans_700Bold' },
    800: { normal: 'NunitoSans_800ExtraBold' },
    900: { normal: 'NunitoSans_800ExtraBold' },
  },
  size: config.fonts.body.size,
  lineHeight: config.fonts.body.lineHeight,
  weight: config.fonts.body.weight,
  letterSpacing: config.fonts.body.letterSpacing,
});

const tamaguiConfig = createTamagui({
  ...config,
  settings: {
    ...config.settings,
    defaultFont: 'body',
  },
  fonts: {
    heading: nunitoSansFont,
    body: nunitoSansFont,
    mono: nunitoSansFont,
  },
});

export type AppConfig = typeof tamaguiConfig;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default tamaguiConfig;
