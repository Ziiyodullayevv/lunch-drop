import type {
  InvoiceStatus,
  InvoiceCustomerRead,
  InvoiceCustomerDetailRead,
} from 'src/lib/api/orders';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { fetchCompanyMe } from 'src/lib/api/companies';
import {
  fetchInvoices,
  fetchInvoiceCustomer,
  fetchInvoiceCustomers,
  updateInvoiceCustomerStatus,
} from 'src/lib/api/orders';

// ----------------------------------------------------------------------

export const invoiceKeys = {
  all: ['invoices'] as const,
  list: () => [...invoiceKeys.all, 'list'] as const,
  company: () => [...invoiceKeys.all, 'company'] as const,
  customers: (month: string, scope: string, companyId?: string) =>
    [...invoiceKeys.all, 'customers', scope, month, companyId] as const,
  customer: (employeeId: string, month: string, scope: string) =>
    [...invoiceKeys.customers(month, scope), employeeId] as const,
};

// ----------------------------------------------------------------------

export function useInvoices() {
  return useQuery({
    queryKey: invoiceKeys.list(),
    queryFn: fetchInvoices,
  });
}

export function useInvoice(id: string, enabled = true) {
  return useQuery({
    queryKey: [...invoiceKeys.list(), id],
    queryFn: async () => {
      const invoices = await fetchInvoices();
      return invoices.find((invoice) => invoice.id === id) ?? null;
    },
    enabled: enabled && !!id,
  });
}

export function useInvoiceCompany() {
  return useQuery({
    queryKey: invoiceKeys.company(),
    queryFn: fetchCompanyMe,
  });
}

export function useInvoiceCustomers(
  month: string,
  scope: 'company' | 'super_admin' = 'company',
  companyId?: string
) {
  return useQuery({
    queryKey: invoiceKeys.customers(month, scope, companyId),
    queryFn: () => fetchInvoiceCustomers(month, scope, companyId),
    enabled: !!month,
  });
}

export function useInvoiceCustomer(
  employeeId: string,
  month: string,
  scope: 'company' | 'super_admin' = 'company',
  enabled = true
) {
  return useQuery({
    queryKey: invoiceKeys.customer(employeeId, month, scope),
    queryFn: () => fetchInvoiceCustomer(employeeId, month, scope),
    enabled: enabled && !!employeeId && !!month,
  });
}

export function useUpdateInvoiceCustomerStatus(
  month: string,
  scope: 'company' | 'super_admin' = 'company'
) {
  const queryClient = useQueryClient();
  const queryKey = [...invoiceKeys.all, 'customers', scope, month] as const;

  return useMutation({
    mutationFn: ({ employeeId, status }: { employeeId: string; status: InvoiceStatus }) =>
      updateInvoiceCustomerStatus(employeeId, month, status, scope),
    onMutate: async ({ employeeId, status }) => {
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueriesData<
        InvoiceCustomerRead[] | InvoiceCustomerDetailRead
      >({ queryKey });

      queryClient.setQueriesData<InvoiceCustomerRead[] | InvoiceCustomerDetailRead>(
        { queryKey },
        (current) => {
          if (Array.isArray(current)) {
            return current.map((customer) =>
              customer.employee_id === employeeId ? { ...customer, status } : customer
            );
          }

          return current?.employee_id === employeeId ? { ...current, status } : current;
        }
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      context?.previous.forEach(([key, value]) => queryClient.setQueryData(key, value));
    },
    onSuccess: (updated, { employeeId }) => {
      queryClient.setQueriesData<InvoiceCustomerRead[] | InvoiceCustomerDetailRead>(
        { queryKey },
        (current) => {
          if (Array.isArray(current)) {
            return current.map((customer) =>
              customer.employee_id === employeeId ? { ...customer, ...updated } : customer
            );
          }

          return current?.employee_id === employeeId
            ? { ...current, status: updated.status }
            : current;
        }
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}
