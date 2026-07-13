import type { AuthResponseDto, EmployeeMenuItemDto, OrderHistoryDto, OrderReadDto } from '@/types/api';
import type { AuthSession, BranchInfo, CurrentUser, MenuItem, Order, OrderStatus } from '@/types/domain';

export function mapUser(
  dto: AuthResponseDto['user'],
  profiles: AuthResponseDto['profiles'] = []
): CurrentUser {
  return {
    id: dto.id,
    role: dto.role as CurrentUser['role'],
    status: dto.is_active ? 'active' : 'blocked',
    accountStatus: dto.account_status ?? 'pending',
    fullName: dto.name ?? '',
    phone: dto.phone,
    avatarUrl: dto.avatar_url ?? undefined,
    branchId: dto.branch_id ?? '',
    branchName: '',
    branchAddress: '',
    companyId: dto.company_id ?? '',
    companyName: '',
    kitchenNames: [],
    balance: 0,
    branches: [],
    profiles: profiles.map((profile) => ({
      id: profile.id,
      role: profile.role as CurrentUser['role'],
      name: profile.name ?? undefined,
      companyId: profile.company_id ?? undefined,
      kitchenId: profile.kitchen_id ?? undefined,
    })),
  };
}

export function mapAuthSession(dto: AuthResponseDto): AuthSession {
  return {
    accessToken: dto.access_token,
    refreshToken: dto.refresh_token,
    user: mapUser(dto.user, dto.profiles),
  };
}

function mapOrderStatus(raw: string): OrderStatus {
  const map: Record<string, OrderStatus> = {
    created:    'created',
    preparing:  'preparing',
    on_the_way: 'on_the_way',
    delivered:  'delivered',
    cancelled:  'cancelled',
  };
  return map[raw.toLowerCase()] ?? 'created';
}

export function mapOrder(dto: OrderHistoryDto): Order {
  const price = parseFloat(dto.historical_price) || 0;
  const fee = parseFloat(dto.system_fee) || 0;
  return {
    id: dto.id,
    kitchenId: dto.kitchen_id,
    kitchenName: dto.kitchen_name,
    branchId: dto.branch_id,
    branchName: dto.branch_name,
    status: mapOrderStatus(dto.status),
    statusLabel: dto.status_label,
    items: dto.items?.length ? dto.items.map((item) => ({
      id: item.meal_id,
      name: item.meal_name ?? '',
      quantity: item.quantity,
      price: parseFloat(item.historical_price) || 0,
      imageUrl: item.meal_image_url ?? undefined,
    })) : [
      {
        id: dto.meal_id,
        name: dto.meal_name,
        quantity: 1,
        price,
        imageUrl: dto.meal_image_url ?? undefined,
      },
    ],
    total: price + fee,
    targetDate: dto.target_date,
    createdAt: dto.created_at,
    deliveryWindow: '',
    paymentMethod: 'corporate_balance',
    paymentStatus: 'pending',
  };
}

// Minimal mapper for create/cancel/confirm responses (no meal/branch enrichment)
export function mapOrderRead(dto: OrderReadDto): Order {
  const price = parseFloat(dto.historical_price) || 0;
  const fee = parseFloat(dto.system_fee) || 0;
  return {
    id: dto.id,
    kitchenId: dto.kitchen_id,
    kitchenName: '',
    branchId: '',
    branchName: '',
    status: mapOrderStatus(dto.status),
    statusLabel: dto.status,
    items: dto.items?.length ? dto.items.map((item) => ({
      id: item.meal_id,
      name: item.meal_name ?? '',
      quantity: item.quantity,
      price: parseFloat(item.historical_price) || 0,
      imageUrl: item.meal_image_url ?? undefined,
    })) : [
      {
        id: dto.meal_id,
        name: '',
        quantity: 1,
        price,
      },
    ],
    total: price + fee,
    targetDate: dto.target_date,
    createdAt: dto.created_at,
    deliveryWindow: '',
    paymentMethod: 'corporate_balance',
    paymentStatus: 'pending',
  };
}

export function mapBranchInfo(dto: { id: string; name: string; address: string }): BranchInfo {
  return { id: dto.id, name: dto.name, address: dto.address };
}

function formatDeliveryWindow(start?: string | null, end?: string | null): string {
  if (!start || !end) return '';
  return `${start.slice(0, 5)} - ${end.slice(0, 5)}`;
}

export function mapEmployeeMenuItem(dto: EmployeeMenuItemDto): MenuItem {
  return {
    id: dto.id,
    kitchenId: dto.kitchen_id,
    kitchenName: dto.kitchen_name ?? '',
    kitchenDeliveryWindow: formatDeliveryWindow(dto.delivery_start_time, dto.delivery_end_time),
    kitchenOrderCutoffTime: dto.order_cutoff_time ?? undefined,
    kitchenDeliveryStartTime: dto.delivery_start_time ?? undefined,
    kitchenDeliveryEndTime: dto.delivery_end_time ?? undefined,
    categoryId: dto.category_id ?? dto.kitchen_id,
    categoryTitle: dto.category_name ?? '',
    name: dto.name,
    description: dto.description ?? '',
    price: parseFloat(dto.price) || 0,
    imageUrl: dto.image_url ?? undefined,
    isAvailable: true,
    availableDays: [],
  };
}
