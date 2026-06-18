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
  const searchTerms = search?.trim().toLowerCase().split(/\s+/).filter(Boolean) ?? [];

  return orders.filter((order) => {
    if (startDate && order.target_date < startDate) return false;
    if (endDate && order.target_date > endDate) return false;
    if (companyId && order.company_id !== companyId) return false;
    if (branchId && order.branch_id !== branchId) return false;
    if (kitchenId && order.kitchen_id !== kitchenId) return false;

    if (searchTerms.length > 0) {
      const searchableValue = [
        order.id,
        order.company_name,
        order.branch_name,
        order.kitchen_name,
        order.employee_name,
        order.meal_name,
        order.target_date,
        order.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (!searchTerms.every((term) => searchableValue.includes(term))) return false;
    }

    return true;
  });
}
