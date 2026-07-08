import type { OrderRead, KitchenMe } from 'src/lib/api/orders';

export type DeliveryGroup = {
  id: string;
  branchId: string;
  branchName: string;
  companyName: string;
  targetDate: string;
  orderIds: string[];
  orderCount: number;
  totalAmount: number;
};

export type DeliveryForm = {
  pickupAddress: string;
  pickupPhone: string;
  pickupLng: string;
  pickupLat: string;
  dropoffAddress: string;
  dropoffPhone: string;
  dropoffContactName: string;
  dropoffLng: string;
  dropoffLat: string;
  weightKg: string;
};

const DELIVERY_ORDER_STATUSES = new Set(['created', 'preparing', 'on_the_way']);
const TERMINAL_YANDEX_STATUSES = new Set([
  'delivered',
  'delivered_finish',
  'returned',
  'returned_finish',
  'failed',
  'cancelled',
  'cancelled_with_payment',
  'cancelled_by_taxi',
  'cancelled_with_items_on_hands',
]);

const ITEM_SIZE = {
  length: 0.4,
  width: 0.4,
  height: 0.3,
};

export function groupOrdersForDelivery(orders: OrderRead[]): DeliveryGroup[] {
  const groups = new Map<string, DeliveryGroup>();

  orders.forEach((order) => {
    if (
      !order.branch_id ||
      !DELIVERY_ORDER_STATUSES.has(order.status)
    ) {
      return;
    }

    const id = `${order.kitchen_id}:${order.branch_id}:${order.target_date}`;
    const existing = groups.get(id);
    const price = Number(order.historical_price);

    if (existing) {
      existing.orderIds.push(order.id);
      existing.orderCount += 1;
      existing.totalAmount += Number.isFinite(price) ? price : 0;
      return;
    }

    groups.set(id, {
      id,
      branchId: order.branch_id,
      branchName: order.branch_name ?? "Noma'lum filial",
      companyName: order.company_name ?? "Noma'lum kompaniya",
      targetDate: order.target_date,
      orderIds: [order.id],
      orderCount: 1,
      totalAmount: Number.isFinite(price) ? price : 0,
    });
  });

  return Array.from(groups.values()).sort((a, b) =>
    `${a.targetDate}:${a.companyName}:${a.branchName}`.localeCompare(
      `${b.targetDate}:${b.companyName}:${b.branchName}`
    )
  );
}

export function createDeliveryForm(group: DeliveryGroup, kitchen?: KitchenMe): DeliveryForm {
  return {
    pickupAddress: '',
    pickupPhone: kitchen?.phone ?? '',
    pickupLng: kitchen && Number.isFinite(kitchen.lng) ? String(kitchen.lng) : '',
    pickupLat: kitchen && Number.isFinite(kitchen.lat) ? String(kitchen.lat) : '',
    dropoffAddress: '',
    dropoffPhone: '',
    dropoffContactName: `${group.companyName} - ${group.branchName}`,
    dropoffLng: '',
    dropoffLat: '',
    weightKg: String(Math.max(1, Number((group.orderCount * 0.6).toFixed(1)))),
  };
}

export function validateDeliveryForm(form: DeliveryForm): string | null {
  if (
    !form.pickupAddress.trim() ||
    !form.pickupPhone.trim() ||
    !form.dropoffAddress.trim() ||
    !form.dropoffPhone.trim() ||
    !form.dropoffContactName.trim()
  ) {
    return "Manzil va aloqa maydonlarini to'ldiring";
  }

  if (!form.pickupPhone.trim().startsWith('+') || !form.dropoffPhone.trim().startsWith('+')) {
    return "Telefon raqamlarini xalqaro formatda kiriting: +998...";
  }

  const pickupLng = Number(form.pickupLng);
  const pickupLat = Number(form.pickupLat);
  const dropoffLng = Number(form.dropoffLng);
  const dropoffLat = Number(form.dropoffLat);
  const weightKg = Number(form.weightKg);

  if (
    !Number.isFinite(pickupLng) ||
    !Number.isFinite(dropoffLng) ||
    pickupLng < -180 ||
    pickupLng > 180 ||
    dropoffLng < -180 ||
    dropoffLng > 180
  ) {
    return "Longitude qiymati -180 va 180 oralig'ida bo'lishi kerak";
  }

  if (
    !Number.isFinite(pickupLat) ||
    !Number.isFinite(dropoffLat) ||
    pickupLat < -90 ||
    pickupLat > 90 ||
    dropoffLat < -90 ||
    dropoffLat > 90
  ) {
    return "Latitude qiymati -90 va 90 oralig'ida bo'lishi kerak";
  }

  if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 20) {
    return "Express yetkazish vazni 0 dan katta va 20 kg dan oshmasligi kerak";
  }

  return null;
}

export function buildCheckPricePayload(form: DeliveryForm) {
  return {
    items: [
      {
        size: ITEM_SIZE,
        weight: Number(form.weightKg),
        quantity: 1,
        pickup_point: 1,
        dropoff_point: 2,
      },
    ],
    route_points: [
      {
        id: 1,
        coordinates: [Number(form.pickupLng), Number(form.pickupLat)],
        fullname: form.pickupAddress.trim(),
      },
      {
        id: 2,
        coordinates: [Number(form.dropoffLng), Number(form.dropoffLat)],
        fullname: form.dropoffAddress.trim(),
      },
    ],
    requirements: {
      taxi_class: 'express',
      cargo_options: ['thermobag'],
      pro_courier: false,
    },
    skip_door_to_door: false,
  };
}

export function buildClaimPayload(
  group: DeliveryGroup,
  kitchen: KitchenMe,
  form: DeliveryForm,
  currency: string
) {
  return {
    items: [
      {
        extra_id: group.id,
        pickup_point: 1,
        droppof_point: 2,
        title: `LunchDrop: ${group.orderCount} ta buyurtma`,
        size: ITEM_SIZE,
        weight: Number(form.weightKg),
        cost_value: group.totalAmount.toFixed(2),
        cost_currency: currency,
        quantity: 1,
      },
    ],
    route_points: [
      {
        point_id: 1,
        visit_order: 1,
        type: 'source',
        contact: {
          name: kitchen.name,
          phone: form.pickupPhone.trim(),
        },
        address: {
          fullname: form.pickupAddress.trim(),
          coordinates: [Number(form.pickupLng), Number(form.pickupLat)],
          country: 'Uzbekistan',
        },
        skip_confirmation: false,
        external_order_id: group.id,
      },
      {
        point_id: 2,
        visit_order: 2,
        type: 'destination',
        contact: {
          name: form.dropoffContactName.trim(),
          phone: form.dropoffPhone.trim(),
        },
        address: {
          fullname: form.dropoffAddress.trim(),
          coordinates: [Number(form.dropoffLng), Number(form.dropoffLat)],
          country: 'Uzbekistan',
        },
        skip_confirmation: false,
        external_order_id: group.id,
      },
    ],
    emergency_contact: {
      name: kitchen.name,
      phone: form.pickupPhone.trim(),
    },
    client_requirements: {
      taxi_class: 'express',
      cargo_options: ['thermobag'],
      pro_courier: false,
    },
    skip_door_to_door: false,
    skip_client_notify: false,
    skip_emergency_notify: false,
    skip_act: false,
    optional_return: false,
    comment: `LunchDrop ${group.companyName} / ${group.branchName}`,
    referral_source: 'lunchdrop',
  };
}

export function isTerminalYandexStatus(status?: string) {
  return status ? TERMINAL_YANDEX_STATUSES.has(status) : false;
}
