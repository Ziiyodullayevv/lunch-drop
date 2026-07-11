export type UserRole = 'super_admin' | 'company_admin' | 'kitchen_admin' | 'employee';

export type UserStatus = 'active' | 'blocked' | 'deleted';

export type KitchenStatus = 'pending' | 'approved' | 'suspended' | 'deleted';

export type OrderStatus = 'created' | 'preparing' | 'on_the_way' | 'delivered' | 'cancelled';

export type PaymentMethod = 'corporate_balance' | 'cash' | 'card';

export type Kitchen = {
  id: string;
  name: string;
  description: string;
  rating: number;
  reviewCount: number;
  cutoffTime: string;
  deliveryWindow: string;
  distanceKm: number;
  coverUrl: string;
  isFavorite: boolean;
  tags: string[];
};

export type MenuCategory = {
  id: string;
  title: string;
};

export type MenuItem = {
  id: string;
  kitchenId: string;
  kitchenName: string;
  kitchenDeliveryWindow: string;
  kitchenOrderCutoffTime?: string;
  kitchenDeliveryStartTime?: string;
  kitchenDeliveryEndTime?: string;
  categoryId: string;
  categoryTitle: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  calories?: number;
  isPopular?: boolean;
  isAvailable: boolean;
  availableDays: number[];
  targetDate?: string;
};

export type CartItem = {
  menuItem: MenuItem;
  kitchenName: string;
  quantity: number;
};

export type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string;
};

export type Order = {
  id: string;
  kitchenId: string;
  kitchenName: string;
  branchId: string;
  branchName: string;
  status: OrderStatus;
  statusLabel: string;
  items: OrderItem[];
  total: number;
  targetDate: string;
  createdAt: string;
  deliveryWindow: string;
  orderCutoffTime?: string;
  deliveryStartTime?: string;
  deliveryEndTime?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: 'paid' | 'pending';
};

export type BranchInfo = {
  id: string;
  name: string;
  address: string;
};

export type CurrentUser = {
  id: string;
  role: UserRole;
  status: UserStatus;
  accountStatus: string; // 'pending' | 'approved' | 'rejected' — raw from backend
  fullName: string;
  phone: string;
  avatarUrl?: string;
  branchId: string;
  branchName: string;
  branchAddress: string;
  companyId: string;
  companyName: string;
  kitchenNames?: string[];
  balance: number;
  branches: BranchInfo[];
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

export type AuthSession = TokenPair & {
  user: CurrentUser;
};

export type NotificationPreferences = {
  telegramEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
};
