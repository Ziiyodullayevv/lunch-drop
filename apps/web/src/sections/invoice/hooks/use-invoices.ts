import { useQuery } from '@tanstack/react-query';

import { fetchInvoices } from 'src/lib/api/orders';

// ----------------------------------------------------------------------

export const invoiceKeys = {
  all:  ['invoices'] as const,
  list: () => [...invoiceKeys.all, 'list'] as const,
};

// ----------------------------------------------------------------------

export function useInvoices() {
  return useQuery({
    queryKey: invoiceKeys.list(),
    queryFn:  fetchInvoices,
  });
}
