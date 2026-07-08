# Testing Rules

## Qaysi narsalar test qilinadi

| Nima | Test yoziladimi | Sabab |
|---|---|---|
| Utility funksiyalar (`utils/`, `lib/utils.ts`) | ✅ Har doim | Pure function — oson va foydali |
| Mapper funksiyalar (`mappers.ts`) | ✅ Har doim | DTO→Domain konversiya xatolari topiladi |
| Zod schema'lar | ✅ Har doim | Validatsiya qoidalari aniq bo'lishi kerak |
| Zustand store aksiyalar | ✅ Har doim | State logikasi murakkab bo'lishi mumkin |
| TanStack Query hooks | ✅ Muhim hooklar | `useQuery`/`useMutation` integratsiya |
| UI komponentlar | ⚠️ Muhimlari | Faqat murakkab interaktiv komponentlar |
| `app/` page'lar | ❌ Kerak emas | Thin shell — test qilgulik narsa yo'q |

## Nima test qilinmaydi

- Oddiy render testlari (`renders without crashing`) — hech qanday qiymat yo'q
- MUI/Tamagui komponentlarning ichki ishlashi
- Third-party kutubxonalar
- Tip tekshiruvi — TypeScript allaqachon qiladi

---

# ADMIN — Vitest + Testing Library

## O'rnatish

```bash
yarn add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom msw
```

`vitest.config.ts` (root):

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: { src: path.resolve(__dirname, 'src') },
  },
});
```

`src/test/setup.ts`:

```ts
import '@testing-library/jest-dom';
```

`package.json` ga qo'shish:

```json
"scripts": {
  "test":       "vitest",
  "test:run":   "vitest run",
  "test:cover": "vitest run --coverage"
}
```

---

## Fayl joylashuvi

Test fayllari test qilinayotgan fayl yonida joylashadi:

```
src/utils/format-time.ts
src/utils/format-time.test.ts

src/sections/orders/hooks/use-orders.ts
src/sections/orders/hooks/use-orders.test.ts

src/lib/api/mappers.ts
src/lib/api/mappers.test.ts
```

---

## Utility funksiya testi

```ts
// src/utils/format-money.test.ts
import { describe, it, expect } from 'vitest';
import { formatMoney } from './format-money';

describe('formatMoney', () => {
  it("musbat qiymatni formatlaydi", () => {
    expect(formatMoney(50000)).toBe("50 000 so'm");
  });

  it("nol qiymatni qaytaradi", () => {
    expect(formatMoney(0)).toBe("0 so'm");
  });

  it("manfiy qiymat", () => {
    expect(formatMoney(-1000)).toBe("-1 000 so'm");
  });
});
```

---

## Mapper testi

```ts
// src/lib/api/mappers.test.ts
import { describe, it, expect } from 'vitest';
import { mapOrder } from './mappers';
import type { OrderDto } from 'src/types/api';

const mockOrderDto: OrderDto = {
  id: 'order-1',
  status: 'cooking',
  kitchen_id: 'kitchen-1',
  total_price: 45000,
  items: [],
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  note: null,
  branch_id: 'branch-1',
  user_id: 'user-1',
  grouped_order_id: null,
  estimated_delivery_at: null,
};

describe('mapOrder', () => {
  it("DTO ni domain tipiga o'giradi", () => {
    const order = mapOrder(mockOrderDto);
    expect(order.id).toBe('order-1');
    expect(order.status).toBe('cooking');
    expect(order.total).toBe(45000);
    expect(order.kitchenId).toBe('kitchen-1');
  });

  it("items bo'sh bo'lsa ham ishlaydi", () => {
    const order = mapOrder({ ...mockOrderDto, items: [] });
    expect(order.items).toEqual([]);
  });
});
```

---

## Zod schema testi

```ts
// src/sections/orders/order-form-schema.test.ts
import { describe, it, expect } from 'vitest';
import { OrderFormSchema } from './order-create-view';

describe('OrderFormSchema', () => {
  it("to'g'ri ma'lumotlarni qabul qiladi", () => {
    const result = OrderFormSchema.safeParse({ title: 'Test', quantity: 2 });
    expect(result.success).toBe(true);
  });

  it("bo'sh title ni rad etadi", () => {
    const result = OrderFormSchema.safeParse({ title: '', quantity: 2 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain('title');
  });

  it("manfiy quantity ni rad etadi", () => {
    const result = OrderFormSchema.safeParse({ title: 'Test', quantity: -1 });
    expect(result.success).toBe(false);
  });
});
```

---

## TanStack Query hook testi (msw bilan)

```ts
// src/sections/orders/hooks/use-orders.test.ts
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { createElement } from 'react';
import { useOrders } from './use-orders';

const server = setupServer(
  http.get('/api/orders', () =>
    HttpResponse.json([{ id: '1', status: 'pending', total: 30000 }])
  )
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useOrders', () => {
  it("orderlarni yuklaydi", async () => {
    const { result } = renderHook(() => useOrders(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.orders).toHaveLength(1);
    expect(result.current.orders[0].id).toBe('1');
  });

  it("server xatosida isError true bo'ladi", async () => {
    server.use(
      http.get('/api/orders', () => HttpResponse.json(null, { status: 500 }))
    );

    const { result } = renderHook(() => useOrders(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
```

---

---

# MOBILE — Jest + Testing Library React Native

## O'rnatish

Expo loyihasida Jest allaqachon tayyor. Qo'shimcha:

```bash
npx expo install jest-expo @testing-library/react-native @testing-library/jest-native
```

`package.json`:

```json
"jest": {
  "preset": "jest-expo",
  "setupFilesAfterFramework": ["@testing-library/jest-native/extend-expect"],
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|tamagui|@tamagui/.*)"
  ]
},
"scripts": {
  "test":       "jest",
  "test:watch": "jest --watch",
  "test:cover": "jest --coverage"
}
```

---

## Fayl joylashuvi

```
src/lib/api/mappers.ts
src/lib/api/mappers.test.ts

src/lib/utils.ts
src/lib/utils.test.ts

src/stores/cart-store.ts
src/stores/cart-store.test.ts

src/hooks/use-orders.ts
src/hooks/use-orders.test.ts
```

---

## Mapper testi

```ts
// src/lib/api/mappers.test.ts
import { mapOrder } from './mappers';
import type { OrderDto } from '@/types/api';

const mockDto: OrderDto = {
  id: 'o1',
  status: 'cooking',
  kitchen_id: 'k1',
  branch_id: 'b1',
  user_id: 'u1',
  total_price: 45000,
  note: null,
  grouped_order_id: null,
  items: [],
  estimated_delivery_at: null,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

describe('mapOrder', () => {
  it("DTO ni domain tipiga o'giradi", () => {
    const order = mapOrder(mockDto);
    expect(order.id).toBe('o1');
    expect(order.status).toBe('cooking');
    expect(order.total).toBe(45000);
    expect(order.kitchenId).toBe('k1');
  });
});
```

---

## Zustand store testi

```ts
// src/stores/cart-store.test.ts
import { useCartStore } from './cart-store';
import type { MenuItem } from '@/types/domain';

const mockItem: MenuItem = {
  id: 'item-1',
  kitchenId: 'k1',
  kitchenName: 'Test Kitchen',
  kitchenDeliveryWindow: '12:00',
  categoryId: 'cat-1',
  categoryTitle: 'Taomlar',
  name: 'Osh',
  description: '',
  price: 25000,
  isAvailable: true,
  availableDays: [1, 2, 3, 4, 5],
};

beforeEach(() => {
  useCartStore.setState({ items: [] });
});

describe('CartStore', () => {
  it("mahsulot qo'shiladi", () => {
    useCartStore.getState().addItem(mockItem, 'Test Kitchen');
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].quantity).toBe(1);
  });

  it("bir xil mahsulot qayta qo'shilsa quantity oshadi", () => {
    useCartStore.getState().addItem(mockItem, 'Test Kitchen');
    useCartStore.getState().addItem(mockItem, 'Test Kitchen');
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].quantity).toBe(2);
  });

  it("quantity 0 bo'lsa mahsulot o'chadi", () => {
    useCartStore.getState().addItem(mockItem, 'Test Kitchen');
    useCartStore.getState().updateQuantity('item-1', 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("clear hammani o'chiradi", () => {
    useCartStore.getState().addItem(mockItem, 'Test Kitchen');
    useCartStore.getState().clear();
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});
```

---

## Zod schema testi

```ts
// src/lib/validation.test.ts
import { phoneSchema } from './validation';

describe('phoneSchema', () => {
  it("to'g'ri telefon raqamni qabul qiladi", () => {
    expect(phoneSchema.safeParse({ phone: '901234567' }).success).toBe(true);
  });

  it("qisqa raqamni rad etadi", () => {
    const result = phoneSchema.safeParse({ phone: '123' });
    expect(result.success).toBe(false);
  });
});
```

---

## Umumiy qoidalar (ikki loyiha uchun ham)

- Har bir test fayli faqat bitta modulni test qiladi
- `describe` → modul nomi, `it` → aniq holat
- Test nomi o'zbek tilida yozish mumkin — muhimi tushunarli bo'lsin
- `beforeEach` da state tozalansin — testlar bir-birini ifloslamamasin
- Mock faqat tashqi bog'liqliklar uchun (API, SecureStore, router) — ichki logikani mock qilma
- Har bir `it` blokida bitta narsa tekshiriladi — bir blokda 5 ta `expect` bo'lsa, ajrat
