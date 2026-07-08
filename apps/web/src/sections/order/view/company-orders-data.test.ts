import { it, expect, describe } from 'vitest';

import { buildCompanyOrdersParams } from './company-orders-data';

describe('company orders filters', () => {
  it('loads orders up to the configured default end date', () => {
    expect(
      buildCompanyOrdersParams({
        startDate: '',
        endDate: '2026-06-12',
        status: 'all',
        limit: 10,
        offset: 0,
      })
    ).toEqual({
      start_date: undefined,
      end_date: '2026-06-12',
      order_status: undefined,
      limit: 10,
      offset: 0,
    });
  });

  it('passes explicitly selected date and status', () => {
    expect(
      buildCompanyOrdersParams({
        startDate: '2026-06-01',
        endDate: '2026-06-11',
        status: 'on_the_way',
        limit: 20,
        offset: 20,
      })
    ).toEqual({
      start_date: '2026-06-01',
      end_date: '2026-06-11',
      order_status: 'on_the_way',
      limit: 20,
      offset: 20,
    });
  });
});
