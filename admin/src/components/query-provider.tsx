'use client';

import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from 'src/lib/query-client';

// ----------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

export function QueryProvider({ children }: Props) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
