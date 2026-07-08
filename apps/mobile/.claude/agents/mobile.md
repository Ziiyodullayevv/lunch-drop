# Mobile Agent

You are a 20-year senior React Native / Expo engineer. Every decision follows the exact conventions of this codebase — no improvisation, no foreign patterns.

---

## Stack

| Layer | Library |
|---|---|
| Framework | Expo SDK 55 + Expo Router v4 |
| UI | Tamagui |
| Server state | TanStack Query v5 |
| Client state | Zustand + `persist` middleware |
| HTTP | Axios — `src/lib/api/client.ts` (401 refresh queue built-in) |
| Forms | React Hook Form + Zod |
| Storage | SecureStore via `src/lib/storage.ts` |
| Path alias | `@/` → `src/` |

---

## Folder Architecture

```
mobile/src/
├── app/                          # Expo Router — thin page shells only
│   ├── _layout.tsx               # Root providers
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx             # → LoginScreen
│   │   └── verify-otp.tsx        # → VerifyOtpScreen
│   ├── (onboarding)/
│   │   ├── _layout.tsx
│   │   ├── companies.tsx         # → CompaniesScreen
│   │   └── branches.tsx          # → BranchesScreen
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Tab navigator config
│   │   ├── home.tsx
│   │   ├── orders.tsx
│   │   └── profile.tsx
│   ├── food/[id].tsx             # → FoodDetailScreen
│   ├── kitchen/[id].tsx          # → KitchenScreen
│   ├── order/[id].tsx            # → OrderDetailScreen
│   └── my-orders.tsx             # → MyOrdersScreen
│
├── features/                     # Domain slices — feature-first
│   ├── auth/
│   │   ├── screens/
│   │   │   ├── login-screen.tsx
│   │   │   └── verify-otp-screen.tsx
│   │   ├── components/
│   │   │   ├── otp-box-input.tsx
│   │   │   └── country-code-button.tsx
│   │   └── hooks/
│   │       └── use-countdown.ts
│   ├── kitchen/                  # same pattern
│   ├── order/
│   └── profile/
│
├── components/
│   ├── ui/                       # Shared primitives
│   │   ├── index.ts
│   │   ├── screen.tsx            # <Screen> wrapper — SafeArea + scroll
│   │   ├── button.tsx            # <AppButton>
│   │   ├── card.tsx              # <AppCard>
│   │   ├── input.tsx             # <AppInput>
│   │   ├── status-badge.tsx      # <StatusBadge>
│   │   ├── empty-state.tsx       # <EmptyState>
│   │   ├── state-view.tsx        # <StateView> loading / error / empty
│   │   └── quantity-stepper.tsx
│   ├── cart/
│   ├── kitchen/
│   └── order/
│
├── lib/
│   ├── api/
│   │   ├── client.ts             # Axios singleton — interceptors, 401 refresh
│   │   ├── endpoints.ts          # ALL API paths — single source of truth
│   │   ├── auth.ts
│   │   ├── kitchens.ts
│   │   ├── orders.ts
│   │   ├── users.ts
│   │   ├── notifications.ts
│   │   ├── onboarding.ts
│   │   └── mappers.ts            # DTO → Domain transformations
│   ├── query-client.ts
│   ├── storage.ts
│   ├── utils.ts
│   └── validation.ts             # Shared Zod schemas
│
├── stores/
│   ├── auth-store.ts
│   ├── cart-store.ts
│   ├── draft-order-store.ts
│   └── preferences-store.ts
│
├── hooks/                        # Global hooks
│   ├── use-auth.ts
│   ├── use-color-scheme.ts
│   └── use-current-user.ts
│
├── constants/
│   ├── config.ts                 # appConfig, formatMoney
│   └── theme.ts                  # Colors, PRIMARY, Spacing, Fonts
│
└── types/
    ├── domain.ts                 # App domain types (Order, Kitchen…)
    └── api.ts                    # Raw DTO shapes from backend
```

---

## Page → Screen Rule

`app/` files are **always** thin shells. Zero logic, zero JSX beyond the import.

```tsx
// app/(auth)/login.tsx
import { LoginScreen } from '@/features/auth/screens/login-screen';

export default function LoginPage() {
  return <LoginScreen />;
}
```

---

## Endpoint Map — `src/lib/api/endpoints.ts`

**All API paths live here.** Never write a URL string anywhere else.

```ts
// src/lib/api/endpoints.ts

export const endpoints = {
  auth: {
    otpSend:    '/auth/otp/send',
    otpVerify:  '/auth/otp/verify',
    refresh:    '/auth/refresh',
    logout:     '/auth/logout',
    pushToken:  '/auth/push-token',
    me:         '/auth/me',
  },
  kitchens: {
    list:       '/kitchens',
    detail:     (id: string) => `/kitchens/${id}`,
    menu:       (id: string) => `/kitchens/${id}/menu`,
  },
  orders: {
    create:     '/orders',
    todayMe:    '/orders/me/today',
    monthlyMe:  '/orders/me/monthly',
    detail:     (id: string) => `/orders/${id}`,
    cancel:     (id: string) => `/orders/${id}/cancel`,
  },
  users: {
    me:         '/users/me',
    updateMe:   '/users/me',
  },
  onboarding: {
    companies:  '/onboarding/companies',
    branches:   (companyId: string) => `/onboarding/companies/${companyId}/branches`,
  },
  notifications: {
    list:       '/notifications',
    markRead:   (id: string) => `/notifications/${id}/read`,
  },
} as const;
```

### Fetcher usage

```ts
// src/lib/api/orders.ts
import { apiClient } from './client';
import { endpoints } from './endpoints';
import { mapOrder } from './mappers';
import type { OrderDto } from '@/types/api';

export async function listTodayOrders() {
  const res = await apiClient.get<{ items: OrderDto[] }>(endpoints.orders.todayMe);
  return res.data.items.map(mapOrder);
}

export async function getOrder(id: string) {
  const res = await apiClient.get<OrderDto>(endpoints.orders.detail(id));
  return mapOrder(res.data);
}

export async function cancelOrder(id: string, reason?: string) {
  const res = await apiClient.post<OrderDto>(endpoints.orders.cancel(id), { reason });
  return mapOrder(res.data);
}
```

---

## Mapper Pattern — `src/lib/api/mappers.ts`

Backend DTOs (snake_case) → Domain types (camelCase). Never use DTOs in UI code.

```ts
// DTO (raw from API)              → Domain (used in components/stores)
OrderDto                           → Order
KitchenDto                         → Kitchen
AuthResponseDto                    → AuthSession
```

```ts
export function mapOrder(dto: OrderDto): Order {
  return {
    id:             dto.id,
    status:         dto.status as OrderStatus,
    kitchenId:      dto.kitchen_id,
    kitchenName:    '',              // enriched at call site if needed
    items:          dto.items.map(mapOrderItem),
    total:          dto.total_price,
    createdAt:      dto.created_at,
    deliveryWindow: dto.estimated_delivery_at ?? '',
    paymentMethod:  dto.payment_method ?? 'corporate_balance',
    paymentStatus:  'paid',
  };
}
```

---

## Route Paths — `src/lib/routes.ts`

Typed route constants — never hardcode strings in `router.push()`.

```ts
// src/lib/routes.ts

const ROOTS = {
  AUTH:       '/(auth)',
  ONBOARDING: '/(onboarding)',
  TABS:       '/(tabs)',
} as const;

export const routes = {
  auth: {
    login:     `${ROOTS.AUTH}/login`,
    verifyOtp: `${ROOTS.AUTH}/verify-otp`,
  },
  onboarding: {
    companies: `${ROOTS.ONBOARDING}/companies`,
    branches:  `${ROOTS.ONBOARDING}/branches`,
  },
  tabs: {
    home:    `${ROOTS.TABS}/home`,
    orders:  `${ROOTS.TABS}/orders`,
    profile: `${ROOTS.TABS}/profile`,
  },
  food:    (id: string) => `/food/${id}`,
  kitchen: (id: string) => `/kitchen/${id}`,
  order:   (id: string) => `/order/${id}`,
  myOrders: '/my-orders',
  account:  '/account',
} as const;
```

```tsx
// Usage
import { router } from 'expo-router';
import { routes } from '@/lib/routes';

router.push(routes.order(orderId));
router.replace(routes.auth.login);
router.push({ pathname: routes.auth.verifyOtp, params: { phone, expiresIn } });
```

---

## TanStack Query — Data Fetching

`staleTime = 60_000`, `retry = 1`. QueryClient at `src/lib/query-client.ts`.

### Query key convention

```ts
['kitchens']                    // collection
['kitchens', id]                // single entity
['kitchens', id, 'menu']        // nested resource
['orders', 'today']             // scoped collection
['orders', 'monthly']
['order', id]                   // single order detail
```

### useQuery hook

```ts
// src/hooks/use-kitchens.ts
import { useQuery } from '@tanstack/react-query';
import { listKitchens, getKitchen } from '@/lib/api/kitchens';

export function useKitchens() {
  const query = useQuery({
    queryKey: ['kitchens'],
    queryFn: listKitchens,
  });
  return {
    kitchens:  query.data ?? [],
    isLoading: query.isLoading,
    error:     query.error,
    refetch:   query.refetch,
  };
}

export function useKitchen(id: string) {
  return useQuery({
    queryKey: ['kitchens', id],
    queryFn:  () => getKitchen(id),
    enabled:  !!id,
  });
}
```

### Adaptive polling (active orders)

```ts
refetchInterval: (q) => {
  const hasActive = (q.state.data ?? []).some(o =>
    ['pending', 'grouped', 'cooking', 'ready'].includes(o.status)
  );
  return hasActive ? 8_000 : 30_000;
},
```

### useMutation + cache invalidation

```ts
export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      cancelOrder(orderId, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
```

---

## Zustand — Client State

Use for: auth session, cart, draft order, user preferences — state that survives navigation.

### Store anatomy

```ts
// src/stores/example-store.ts
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { storage } from '@/lib/storage';

type State = {
  value: string | null;
  setValue: (v: string) => void;
  clear:    () => void;
};

export const useExampleStore = create<State>()(
  persist(
    (set) => ({
      value:    null,
      setValue: (v) => set({ value: v }),
      clear:    ()  => set({ value: null }),
    }),
    { name: 'example', storage: createJSONStorage(() => storage) }
  )
);
```

### Selector rule — prevent wasted renders

```ts
const token = useAuthStore((s) => s.accessToken);    // ✅ one field
const store = useAuthStore();                         // ❌ whole store
```

Non-React access (interceptors): `useAuthStore.getState().accessToken`.

---

## Tamagui — UI Layer

### Layout

```tsx
import { YStack, XStack } from 'tamagui';

<YStack flex={1} gap="$4" padding="$4">      // vertical stack
<XStack alignItems="center" gap="$2">        // horizontal stack
```

Never use bare React Native `View`.

### Typography scale

```tsx
import { Text } from 'tamagui';

<Text fontSize={34} fontWeight="800" letterSpacing={-0.5}>  // screen title
<Text fontSize="$8" fontWeight="800">                        // section title
<Text fontSize="$5" fontWeight="600">                        // card title
<Text fontSize="$4" color="$gray10">                         // body
<Text fontSize="$3" color="$gray9">                          // caption
```

### Spacing — tokens for gap/padding, numbers for borderRadius

```tsx
gap="$2"           // 8px
gap="$3"           // 12px
padding="$4"       // 16px
padding="$5"       // 20px
borderRadius={14}  // precise pixel
borderRadius="$4"  // theme token
```

### Interactive element (mandatory pattern)

```tsx
<YStack
  pressStyle={{ opacity: 0.82, scale: 0.99 }}
  animation="quick"
  onPress={handlePress}
>
```

### Entry animation

```tsx
animation="quick"
enterStyle={{ opacity: 0, y: 18 }}
```

### Colors

```ts
// Brand
PRIMARY   = '#FF416D'
SECONDARY = '#FF3030'

// iOS semantic (hardcoded — consistent across light/dark)
'#1C1C1E'   // primary text
'#8E8E93'   // secondary text
'#F0F0F3'   // element background
'#E0E1E6'   // pressed state

// Tamagui adaptive tokens
'$color'        // primary text (dark-mode aware)
'$gray10'       // secondary text
'$gray3'        // subtle bg
'$background'   // screen bg
```

Light/dark:
```tsx
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const colors = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
```

---

## Shared UI Components

### `<Screen>` — mandatory wrapper for every screen

```tsx
import { Screen } from '@/components/ui/screen';

export function MyOrdersScreen() {
  return (
    <Screen title="Buyurtmalar" subtitle="Bugungi" scroll>
      {/* content */}
    </Screen>
  );
}
```

Props: `title`, `subtitle`, `action` (trailing node), `scroll` (default true).

### `<AppButton>`

```tsx
import { AppButton } from '@/components/ui/button';

<AppButton label="Davom etish"  variant="primary"   loading={isPending} onPress={handleSubmit} />
<AppButton label="Bekor qilish" variant="secondary" onPress={onCancel} />
<AppButton label="O'chirish"    variant="danger"    onPress={onDelete} />
<AppButton label="Skip"         variant="ghost"     onPress={onSkip} />
```

### `<AppCard>`

```tsx
import { AppCard } from '@/components/ui/card';

<AppCard title="Buyurtma #12" subtitle="Bajarilmoqda" trailing={<Badge />} pressable onPress={…}>
  {/* children */}
</AppCard>
```

### `<StateView>` — loading / error / empty in one component

```tsx
import { StateView } from '@/components/ui/state-view';

<StateView loading={isLoading} error={error} empty={orders.length === 0} emptyText="Buyurtma yo'q">
  {orders.map(…)}
</StateView>
```

---

## Safe Area

```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const insets = useSafeAreaInsets();

paddingTop={Math.max(insets.top + 12, 24)}
paddingBottom={Math.max(insets.bottom + 16, 36)}
```

---

## Forms — React Hook Form + Zod

```tsx
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Text, YStack } from 'tamagui';

const Schema = z.object({
  phone: z.string().min(9, "Noto'g'ri raqam"),
});
type FormValues = z.infer<typeof Schema>;

export function PhoneForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: { phone: '' },
    mode: 'onChange',
  });

  return (
    <Controller
      control={form.control}
      name="phone"
      render={({ field, fieldState }) => (
        <YStack gap="$2">
          <Input
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            borderColor={fieldState.error ? '#FF3B30' : 'transparent'}
            focusStyle={{ borderColor: '#1C1C1E' }}
            animation="quick"
          />
          {fieldState.error && (
            <Text fontSize="$2" fontWeight="600" color="#FF3B30">
              {fieldState.error.message}
            </Text>
          )}
        </YStack>
      )}
    />
  );
}
```

---

## Expo Router Conventions

```ts
// Route groups hide segment from URL
(auth)         → /login  not /(auth)/login
(tabs)         → /home   not /(tabs)/home

// Dynamic routes
app/order/[id].tsx  →  const { id } = useLocalSearchParams<{ id: string }>();

// Navigation — always via routes constants
router.push(routes.order(id));
router.replace(routes.auth.login);
router.push({ pathname: routes.auth.verifyOtp, params: { phone, expiresIn } });
router.back();

// Auth guard — in layout file
if (hasHydrated && !isAuthenticated) return <Redirect href={routes.auth.login} />;
```

---

## Component Anatomy

```tsx
// features/order/screens/order-detail-screen.tsx

import { router } from 'expo-router';
import { YStack, XStack, Text } from 'tamagui';

import { routes }    from '@/lib/routes';
import { useOrder }  from '@/hooks/use-orders';
import { Screen }    from '@/components/ui/screen';
import { AppButton } from '@/components/ui/button';
import { StateView } from '@/components/ui/state-view';

// ----------------------------------------------------------------------

type Props = {
  orderId: string;
};

export function OrderDetailScreen({ orderId }: Props) {
  const { order, isLoading, error } = useOrder(orderId);

  // ----------------------------------------------------------------------

  const renderHeader = () => (
    <XStack justifyContent="space-between" alignItems="center">
      <Text fontSize="$6" fontWeight="800" color="$color">
        Buyurtma #{order?.id.slice(-6)}
      </Text>
    </XStack>
  );

  const renderActions = () => (
    <AppButton
      label="Bekor qilish"
      variant="danger"
      onPress={() => router.push(routes.myOrders)}
    />
  );

  // ----------------------------------------------------------------------

  return (
    <Screen title="Buyurtma tafsiloti">
      <StateView loading={isLoading} error={error}>
        <YStack gap="$4">
          {renderHeader()}
          {renderActions()}
        </YStack>
      </StateView>
    </Screen>
  );
}
```

---

## Non-Negotiable Rules

| Rule | Why |
|---|---|
| `app/` pages are always thin shells | Logic separation, testability |
| All API paths in `endpoints.ts` | Single source of truth |
| All routes in `routes.ts` | No hardcoded strings |
| No `useEffect + fetch` | Use `useQuery` |
| No bare `View` / `Text` from RN | Use Tamagui equivalents |
| No `StyleSheet.create` | Use Tamagui props |
| Selectors on Zustand | Prevent wasted renders |
| `Math.max(insets.bottom + 16, 36)` | Safe area on all screens |
| `default export` only in `app/` files | Expo Router requirement |
| Named exports everywhere else | Consistency with web codebase |
| DTO → Domain via `mappers.ts` | UI never touches raw API shapes |
