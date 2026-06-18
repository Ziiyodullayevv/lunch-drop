import type { OrderStatus } from 'src/lib/api/orders';

type CompanyOrdersFilters = {
  startDate: string;
  endDate: string;
  status: OrderStatus | 'all';
  limit: number;
  offset: number;
};

export function buildCompanyOrdersParams({
  startDate,
  endDate,
  status,
  limit,
  offset,
}: CompanyOrdersFilters) {
  return {
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    order_status: status === 'all' ? undefined : status,
    limit,
    offset,
  };
}
