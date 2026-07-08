export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

// ─── Auth ────────────────────────────────────────────────────────────────────

export type AuthUserDto = {
  id: string;
  phone: string;
  name: string | null;
  role: string;
  is_active: boolean;
  account_status: string;
  company_id: string | null;
  branch_id?: string | null;
  kitchen_id: string | null;
  avatar_url?: string | null;
};

export type AuthTokenDto = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export type AuthMeResponseDto = {
  user: AuthUserDto;
};

// Internal composite type used in mappers (assembled after login + /auth/me)
export type AuthResponseDto = AuthTokenDto & {
  user: AuthUserDto;
};

// ─── Employee ────────────────────────────────────────────────────────────────

export type BranchPublicDto = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

export type EmployeeStatusDto = {
  account_status: string | null;
  company_id: string | null;
  branches: BranchPublicDto[];
};

export type CompanyBranchDto = {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
};

export type CompanyWithBranchesDto = {
  id: string;
  name: string;
  branches: CompanyBranchDto[];
};

// ─── Menu ─────────────────────────────────────────────────────────────────────

export type EmployeeMenuItemDto = {
  id: string;
  kitchen_id: string;
  kitchen_name?: string | null;
  category_id: string | null;
  category_name?: string | null;
  name: string;
  description: string | null;
  price: string;
  image_url: string | null;
  delivery_start_time?: string | null;
  delivery_end_time?: string | null;
};

export type KitchenScheduleDto = {
  id: string;
  name: string;
  delivery_start_time: string | null;
  delivery_end_time: string | null;
  order_cutoff_time: string | null;
};

export type EmployeeMenuResponseDto = {
  target_date: string;
  items: EmployeeMenuItemDto[];
};

// ─── Orders ──────────────────────────────────────────────────────────────────

// GET /orders and GET /orders/{id} — OrderHistoryItem from backend
export type OrderHistoryDto = {
  id: string;
  target_date: string;
  status: string;
  status_label: string;
  historical_price: string;
  system_fee: string;
  meal_id: string;
  meal_name: string;
  meal_image_url: string | null;
  kitchen_id: string;
  kitchen_name: string;
  branch_id: string;
  branch_name: string;
  created_at: string;
};

// POST /orders, POST /orders/{id}/cancel, PATCH /orders/{id}/confirm-delivery
export type OrderReadDto = {
  id: string;
  employee_id: string;
  kitchen_id: string;
  meal_id: string;
  target_date: string;
  historical_price: string;
  system_fee: string;
  status: string;
  created_at: string;
};

export type OrderListResponseDto = PaginatedResponse<OrderHistoryDto>;

export type CreateOrderInput = {
  branch_id: string;
  kitchen_id: string;
  meal_id: string;
  target_date: string;
};

export type OtpSendResponseDto = {
  message: string;
  expires_in: number;
};
