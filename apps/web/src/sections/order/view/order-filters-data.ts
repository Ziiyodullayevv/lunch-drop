import type { OrderRead } from 'src/lib/api/orders';

export type OrderFilterCriteria = {
  startDate?: string;
  endDate?: string;
  companyId?: string;
  branchId?: string;
  kitchenId?: string;
  search?: string;
};

export function filterOrdersForView(
  orders: OrderRead[],
  {
    startDate,
    endDate,
    companyId,
    branchId,
    kitchenId,
    search,
  }: OrderFilterCriteria
) {
  const searchQuery = search?.trim().toLowerCase() ?? '';
  const searchTerms = searchQuery.split(/\s+/).filter(Boolean);
  const phoneQuery = searchQuery.replace(/\D/g, '');
  const isPhoneSearch = /^[+\d\s()-]+$/.test(searchQuery) && phoneQuery.length >= 3;

  return orders.filter((order) => {
    if (startDate && order.target_date < startDate) return false;
    if (endDate && order.target_date > endDate) return false;
    if (companyId && order.company_id !== companyId) return false;
    if (branchId && order.branch_id !== branchId) return false;
    if (kitchenId && order.kitchen_id !== kitchenId) return false;

    if (searchTerms.length > 0) {
      const searchableValue = [
        order.id,
        `#${order.id}`,
        order.employee_name,
        order.employee_phone,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const normalizedPhone = order.employee_phone?.replace(/\D/g, '') ?? '';
      const matchesText = searchTerms.every((term) => searchableValue.includes(term));
      const matchesPhone = isPhoneSearch && normalizedPhone.includes(phoneQuery);

      if (!matchesText && !matchesPhone) return false;
    }

    return true;
  });
}
