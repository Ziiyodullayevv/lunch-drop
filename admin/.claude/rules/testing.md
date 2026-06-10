# Testing Rules — Admin (Next.js)

## Qaysi narsalar test qilinadi

| Fayl / qatlam | Test yoziladimi | Misol |
|---|---|---|
| `src/utils/*.ts` | ✅ Har doim | `fCurrency`, `fNumber`, `fData` |
| Section Zod schema'lari | ✅ Har doim | `BranchSchema`, `KitchenSchema` |
| `src/sections/<domain>/hooks/*.ts` | ✅ Qo'shilganda | TanStack Query hooks |
| `src/auth/utils/*.ts` | ✅ | `getErrorMessage` va boshqalar |
| `app/` page'lar | ❌ | Thin shell — test qilgulik narsa yo'q |
| MUI komponentlar | ❌ | Third-party — test qilinmaydi |

## Nima test qilinmaydi

- Oddiy render testlari — hech qanday qiymat yo'q
- MUI komponentlarning ichki ishlashi
- `layout.tsx`, `loading.tsx`, `page.tsx` fayllari
- Tip tekshiruvi — TypeScript allaqachon qiladi

---

## O'rnatish

```bash
yarn add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom msw
```

`vitest.config.ts` (admin/ root):

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

`package.json` scripts:

```json
"test":       "vitest",
"test:run":   "vitest run",
"test:cover": "vitest run --coverage"
```

---

## Fayl joylashuvi

Test fayli **test qilinayotgan fayl yonida** — alohida papka emas:

```
src/utils/format-number.ts        → src/utils/format-number.test.ts
src/utils/format-time.ts          → src/utils/format-time.test.ts
src/auth/utils/error-message.ts   → src/auth/utils/error-message.test.ts

src/sections/branch/view/branch-create-view.tsx
  → src/sections/branch/view/branch-create-view.test.ts   (faqat Schema eksport qilingan bo'lsa)

src/sections/orders/hooks/use-orders.ts
  → src/sections/orders/hooks/use-orders.test.ts
```

---

## 1. Utility funksiya testlari — `src/utils/format-number.ts`

Bu loyihadagi eng muhim test kandidati. Haqiqiy funksiya nomlari: `fCurrency`, `fNumber`, `fPercent`, `fShortenNumber`, `fData`.

```ts
// src/utils/format-number.test.ts
import { describe, it, expect } from 'vitest';
import { fCurrency, fNumber, fPercent, fShortenNumber, fData } from './format-number';

describe('fCurrency', () => {
  it("UZS formatida so'm bilan qaytaradi", () => {
    expect(fCurrency(50000)).toBe("50 000 so'm");
  });

  it("nol qiymat", () => {
    expect(fCurrency(0)).toBe("0 so'm");
  });

  it("null va undefined bo'sh string qaytaradi", () => {
    expect(fCurrency(null)).toBe('');
    expect(fCurrency(undefined)).toBe('');
  });
});

describe('fNumber', () => {
  it("raqamni lokalizatsiya bilan formatlaydi", () => {
    expect(fNumber(1234567)).toBeTruthy();
  });

  it("null bo'sh string qaytaradi", () => {
    expect(fNumber(null)).toBe('');
  });
});

describe('fPercent', () => {
  it("100 ni '100%' ga aylantiradi", () => {
    expect(fPercent(100)).toContain('100');
  });

  it("50 ni '50%' ga aylantiradi", () => {
    expect(fPercent(50)).toContain('50');
  });
});

describe('fShortenNumber', () => {
  it("katta raqamni qisqartiradi", () => {
    const result = fShortenNumber(1000000);
    expect(result).toContain('m');   // "1m" yoki "1.0m"
  });
});

describe('fData', () => {
  it("0 bytes", () => {
    expect(fData(0)).toBe('0 bytes');
  });

  it("1024 ni Kb ga aylantiradi", () => {
    expect(fData(1024)).toContain('Kb');
  });

  it("null bo'sh string qaytaradi", () => {
    expect(fData(null)).toBe('0 bytes');
  });
});
```

---

## 2. Zod schema testlari — section view fayllaridan

Schema komponent ichida emas, **tashqarida** (module scope) e'lon qilinishi va `export` bo'lishi shart:

```ts
// src/sections/branch/view/branch-create-view.tsx
export const BranchSchema = z.object({
  company_id: z.string().min(1, 'Kompaniya tanlanishi shart'),
  name:       z.string().min(1, 'Filial nomi majburiy'),
  address:    z.string().min(1, 'Manzil majburiy'),
});
```

```ts
// src/sections/branch/view/branch-create-view.test.ts
import { describe, it, expect } from 'vitest';
import { BranchSchema } from './branch-create-view';

describe('BranchSchema', () => {
  it("to'liq ma'lumotlar bilan o'tadi", () => {
    const result = BranchSchema.safeParse({
      company_id: 'comp-1',
      name: 'Chilonzor filiali',
      address: 'Chilonzor 4',
    });
    expect(result.success).toBe(true);
  });

  it("bo'sh name ni rad etadi", () => {
    const result = BranchSchema.safeParse({
      company_id: 'comp-1',
      name: '',
      address: 'Chilonzor 4',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain('name');
  });

  it("company_id yo'q bo'lsa rad etadi", () => {
    const result = BranchSchema.safeParse({ name: 'Test', address: 'Test' });
    expect(result.success).toBe(false);
  });
});
```

---

## 3. TanStack Query hook testlari (hooks qo'shilganda)

Hook `src/sections/<domain>/hooks/use-<domain>.ts` da bo'lganda:

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
  http.get('*/api/orders*', () =>
    HttpResponse.json([
      { id: 'o-1', status: 'pending', total_price: 30000, kitchen_id: 'k-1', items: [] }
    ])
  )
);

beforeAll(()  => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(()  => server.resetHandlers());
afterAll(()   => server.close());

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client: qc }, children);
}

describe('useOrders', () => {
  it("orderlarni yuklaydi", async () => {
    const { result } = renderHook(() => useOrders(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.orders).toHaveLength(1);
    expect(result.current.orders[0].id).toBe('o-1');
  });

  it("server 500 da isError bo'ladi", async () => {
    server.use(
      http.get('*/api/orders*', () => HttpResponse.json(null, { status: 500 }))
    );
    const { result } = renderHook(() => useOrders(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
```

---

## Umumiy qoidalar

- Har bir `it` — bitta aniq holat, bitta `expect` group
- `describe` — test qilinayotgan funksiya yoki modul nomi
- Test nomlari o'zbek tilida yozilishi mumkin
- Mock faqat tashqi bog'liqliklar uchun (axios, router, sessionStorage)
- Schema'lar har doim `export` qilinsin — test qilish uchun
- `yarn test:run` bilan testlar o'tishini tekshir
