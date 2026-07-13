import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    tint: '#5BE49B',
    border: '#E5E7EB',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    tint: '#5BE49B',
    border: '#2E3135',
  },
} as const;

export const PrimaryPalette = {
  lighter: '#C8FAD6',
  light: '#5BE49B',
  main: '#5BE49B',
  dark: '#007867',
  darker: '#004B50',
} as const;

export const PRIMARY = PrimaryPalette.main;
export const SECONDARY = '#00A76F';
export const DANGER = '#FF3B30';
export const PRIMARY_ON = PrimaryPalette.darker;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = {
  sans: 'NunitoSans_400Regular',
  medium: 'NunitoSans_500Medium',
  bold: 'NunitoSans_800ExtraBold',
  mono: 'NunitoSans_400Regular',
};

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
