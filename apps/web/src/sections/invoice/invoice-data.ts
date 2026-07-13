import type { IInvoice } from 'src/types/invoice';
import type { IAddressItem } from 'src/types/common';
import type { InvoiceRead } from 'src/lib/api/orders';

export const DEMO_INVOICE: InvoiceRead = {
  id: 'demo-invoice-2026-07',
  company_id: 'demo-company',
  period_start: '2026-07-01',
  period_end: '2026-07-31',
  total_company_expense: '870000',
  total_system_fee: '26100',
  total_kitchen_profit: '843900',
  status: 'pending',
  created_at: '2026-08-01T00:00:00+05:00',
  branch_summaries: [
    {
      branch_id: 'demo-branch-chilonzor',
      branch_name: 'Chilonzor filiali',
      order_count: 18,
      total_amount: '540000',
      pending_count: 0,
    },
    {
      branch_id: 'demo-branch-yunusobod',
      branch_name: 'Yunusobod filiali',
      order_count: 11,
      total_amount: '330000',
      pending_count: 0,
    },
  ],
  employee_summaries: [
    {
      employee_id: 'demo-employee-1',
      employee_name: 'Akobir Ziyodullayev',
      branch_id: 'demo-branch-chilonzor',
      branch_name: 'Chilonzor filiali',
      order_count: 10,
      total_amount: '300000',
      delivered_count: 10,
    },
    {
      employee_id: 'demo-employee-2',
      employee_name: 'Madina Karimova',
      branch_id: 'demo-branch-chilonzor',
      branch_name: 'Chilonzor filiali',
      order_count: 8,
      total_amount: '240000',
      delivered_count: 8,
    },
    {
      employee_id: 'demo-employee-3',
      employee_name: 'Sardor Aliyev',
      branch_id: 'demo-branch-yunusobod',
      branch_name: 'Yunusobod filiali',
      order_count: 11,
      total_amount: '330000',
      delivered_count: 11,
    },
  ],
};

const emptyAddress = (id: string, name: string): IAddressItem => ({
  id,
  name,
  fullAddress: '',
  phoneNumber: '',
  company: name,
  addressType: '',
  primary: true,
});

export function mapInvoice(invoice: InvoiceRead, companyName?: string): IInvoice {
  const name = companyName || invoice.company_id;

  return {
    id: invoice.id,
    invoiceNumber: `INV-${invoice.id.slice(0, 8).toUpperCase()}`,
    createDate: invoice.period_start,
    dueDate: invoice.period_end,
    createdAt: invoice.created_at,
    status: invoice.status,
    totalAmount: Number(invoice.total_company_expense),
    subtotal: Number(invoice.total_kitchen_profit),
    taxes: Number(invoice.total_system_fee),
    sent: 0,
    discount: 0,
    shipping: 0,
    invoiceFrom: emptyAddress('lunchdrop', 'LunchDrop'),
    invoiceTo: emptyAddress(invoice.company_id, name),
    companyName: name,
    branchSummary: `${invoice.branch_summaries?.length ?? 0} ta filial · ${invoice.employee_summaries?.length ?? 0} ta buyurtmachi`,
    branchSummaries: invoice.branch_summaries ?? [],
    employeeSummaries: invoice.employee_summaries ?? [],
    items: (invoice.branch_summaries ?? []).map((branch) => ({
      id: branch.branch_id,
      title: branch.branch_name,
      description: `${branch.order_count} ta buyurtma`,
      service: 'branch',
      quantity: branch.order_count,
      price: branch.order_count ? Number(branch.total_amount) / branch.order_count : 0,
      total: Number(branch.total_amount),
    })),
  };
}
