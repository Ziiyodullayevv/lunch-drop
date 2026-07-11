import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { Text as RNText, TextInput as RNTextInput } from 'react-native';
import { Input as TamaguiInput, TamaguiProvider, Text as TamaguiText } from 'tamagui';

import { CustomAlertProvider } from '@/components/ui/custom-alert';
import { queryClient } from '@/lib/query-client';

import tamaguiConfig from '../../tamagui.config';

const BODY_FONT = 'NunitoSans_400Regular';

function applyDefaultFont(Component: any) {
  Component.defaultProps = Component.defaultProps ?? {};
  const currentStyle = Component.defaultProps.style;
  Component.defaultProps.style = [
    { fontFamily: BODY_FONT },
    ...(Array.isArray(currentStyle) ? currentStyle : currentStyle ? [currentStyle] : []),
  ];
}

applyDefaultFont(RNText);
applyDefaultFont(RNTextInput);

TamaguiText.defaultProps = {
  ...(TamaguiText.defaultProps ?? {}),
  fontFamily: '$body',
};
TamaguiInput.defaultProps = {
  ...(TamaguiInput.defaultProps ?? {}),
  fontFamily: '$body',
};

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={DefaultTheme}>
          <CustomAlertProvider>
            {children}
          </CustomAlertProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </TamaguiProvider>
  );
}
