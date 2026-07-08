# API & Data Fetching Rules

## Architecture

```
src/lib/
├── axios.ts            # Singleton Axios instance + interceptors + endpoints map
├── query-client.ts     # TanStack QueryClient singleton
└── api/
    ├── orders.ts       # Raw fetcher functions (no React hooks)
    ├── users.ts
    └── auth.ts

src/sections/<domain>/hooks/
└── use-<domain>.ts     # useQuery / useMutation hooks that consume src/lib/api/
```

Fetchers (`src/lib/api/`) are plain async functions — no React dependency, fully testable.
Hooks (`sections/<domain>/hooks/`) wrap fetchers with TanStack Query for React components.

---

## Axios Instance (`src/lib/axios.ts`)

```ts
import type { AxiosRequestConfig } from 'axios';
import axios from 'axios';
import { CONFIG } from 'src/global-config';

const axiosInstance = axios.create({
  baseURL: CONFIG.serverUrl,
  headers: { 'Content-Type': 'application/json' },
});

axiosInstance.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('access-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.message ?? error?.message ?? 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export default axiosInstance;

export const fetcher = async <T = unknown>(
  args: string | [string, AxiosRequestConfig]
): Promise<T> => {
  const [url, config] = Array.isArray(args) ? args : [args, {}];
  const res = await axiosInstance.get<T>(url, config);
  return res.data;
};
```

---

## Endpoint Map

All API paths live in the `endpoints` const object in `src/lib/axios.ts`. Never inline URL strings elsewhere.

```ts
export const endpoints = {
  auth: {
    me: '/api/auth/me',
    signIn: '/api/auth/sign-in',
    signUp: '/api/auth/sign-up',
  },
  orders: {
    list: '/api/orders',
    detail: (id: string) => `/api/orders/${id}`,
    create: '/api/orders',
    update: (id: string) => `/api/orders/${id}`,
    delete: (id: string) => `/api/orders/${id}`,
  },
} as const;
```

---

## TanStack Query

### QueryClient (`src/lib/query-client.ts`)

```ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

Wrap the app in `<QueryClientProvider client={queryClient}>` inside `src/app/layout.tsx`.

### useQuery pattern

```ts
// src/sections/orders/hooks/use-orders.ts
import { useQuery } from '@tanstack/react-query';
import { fetcher, endpoints } from 'src/lib/axios';
import type { OrderListResponse, Order } from '../types';

export function useOrders(params?: OrderParams) {
  return useQuery<OrderListResponse>({
    queryKey: ['orders', params],
    queryFn: () => fetcher<OrderListResponse>([endpoints.orders.list, { params }]),
  });
}

export function useOrder(id: string) {
  return useQuery<Order>({
    queryKey: ['orders', id],
    queryFn: () => fetcher<Order>(endpoints.orders.detail(id)),
    enabled: !!id,
  });
}
```

### Query key convention

```ts
['orders']                // collection
['orders', { status }]    // filtered collection
['orders', id]            // single entity
['orders', id, 'items']   // nested resource
```

For domains referenced in more than two places, export a `queryKeys` object:

```ts
export const orderKeys = {
  all: ['orders'] as const,
  list: (params?: object) => [...orderKeys.all, params] as const,
  detail: (id: string) => [...orderKeys.all, id] as const,
};
```

### useMutation pattern

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance, { endpoints } from 'src/lib/axios';
import { orderKeys } from './query-keys';

export function useDeleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      axiosInstance.delete(endpoints.orders.delete(id)).then((r) => r.data),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      queryClient.removeQueries({ queryKey: orderKeys.detail(id) });
    },
  });
}
```

### Optimistic updates (status toggles, reorders)

```ts
onMutate: async (newStatus) => {
  await queryClient.cancelQueries({ queryKey: orderKeys.detail(id) });
  const previous = queryClient.getQueryData<Order>(orderKeys.detail(id));
  queryClient.setQueryData<Order>(orderKeys.detail(id), (old) =>
    old ? { ...old, status: newStatus } : old
  );
  return { previous };
},
onError: (_err, _vars, context) => {
  if (context?.previous) {
    queryClient.setQueryData(orderKeys.detail(id), context.previous);
  }
},
```

---

## Error Handling

- Axios interceptor normalizes all errors to `new Error(message)`.
- Components use `isError` and `error.message` from query results.
- Mutation errors: local `useState<string | null>(null)` → `<Alert severity="error">`.

```tsx
const { data, isLoading, isError, error } = useOrders();

if (isError) return <Alert severity="error">{error.message}</Alert>;
```

---

## Auth Requests

- `signInWithPassword` / `signUp` — plain async functions in `src/auth/context/jwt/action.ts`.
- They call Axios directly and invoke `setSession(accessToken)` on success.
- All subsequent requests use the Axios instance — the interceptor attaches the JWT automatically.

---

## Rules at a Glance

| Rule | Reason |
|---|---|
| All server state via TanStack Query | Caching, deduplication, background refresh |
| Never `useEffect + fetch` | Bypasses cache, causes waterfalls |
| `enabled: !!id` on detail queries | Prevents queries with undefined IDs |
| `staleTime` ≥ 60s on list queries | Avoids redundant refetches on tab focus |
| URL paths only in `endpoints` object | Single source of truth |
| Fetchers in `lib/api/`, hooks in `sections/` | Separation of concerns, testability |
