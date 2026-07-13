import { it, expect, describe } from 'vitest';

import { mapInvoice } from './invoice-data';

const invoice = {
  id: 'invoice-12345678',
  company_id: 'company-1',
  period_start: '2026-07-01',
  period_end: '2026-07-31',
  total_company_expense: '130000',
  total_system_fee: '10000',
  total_kitchen_profit: '120000',
  status: 'pending' as const,
  created_at: '2026-08-01T00:00:00Z',
  branch_summaries: [
    {
      branch_id: 'branch-1',
      branch_name: 'Chilonzor filiali',
      order_count: 2,
      total_amount: '90000',
      pending_count: 0,
    },
  ],
  employee_summaries: [
    {
      employee_id: 'employee-1',
      employee_name: 'Akobir Ziyodullayev',
      branch_id: 'branch-1',
      branch_name: 'Chilonzor filiali',
      order_count: 2,
      total_amount: '90000',
      delivered_count: 2,
    },
  ],
};

describe('mapInvoice', () => {
  it('API invoice ma’lumotini list va detail modeliga aylantiradi', () => {
    const result = mapInvoice(invoice, 'Mars IT');

    expect(result.invoiceTo.name).toBe('Mars IT');
    expect(result.totalAmount).toBe(130000);
    expect(result.taxes).toBe(10000);
    expect(result.items[0]).toMatchObject({
      title: 'Chilonzor filiali',
      quantity: 2,
      total: 90000,
    });
    expect(result.employeeSummaries?.[0].employee_name).toBe('Akobir Ziyodullayev');
  });
});
