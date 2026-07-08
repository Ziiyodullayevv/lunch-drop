# Skill: write-tests

**Trigger:** user types `/write-tests <fayl yoki domain nomi>`

Berilgan fayl yoki domain uchun test yoz. Avval faylni o'qi, keyin quyidagi algoritmni bajara.

---

## Algoritm

### 1. Faylni o'qi va nima test qilish kerakligini aniqlа

```
Utility funksiya  → har bir funksiya uchun test
Mapper funksiya   → har bir mapper + edge case'lar
Zod schema        → valid / invalid input'lar
Zustand store     → har bir aksiya + side effect'lar
TanStack hook     → loading, success, error holatlari
Komponent        → faqat interaktiv yoki murakkab logika bo'lsa
```

### 2. Loyihani aniqlа

- `src/lib/axios.ts` yoki `src/components/` → **admin** (Vitest)
- `@/lib/` yoki `@/stores/` → **mobile** (Jest)

### 3. Test faylini yaratish joyi

Test fayli **test qilinayotgan fayl yonida** bo'ladi:

```
src/utils/format-money.ts       → src/utils/format-money.test.ts
src/lib/api/mappers.ts          → src/lib/api/mappers.test.ts
src/stores/cart-store.ts        → src/stores/cart-store.test.ts
src/sections/orders/hooks/...   → ...hooks/use-orders.test.ts
```

---

## Test yozish qoidalari

```ts
// ✅ Har bir test bitta narsani tekshiradi
it("bo'sh title ni rad etadi", () => {
  const result = schema.safeParse({ title: '' });
  expect(result.success).toBe(false);
});

// ❌ Bitta testda ko'p narsa
it("schema ishlaydi", () => {
  expect(schema.safeParse({ title: 'ok' }).success).toBe(true);
  expect(schema.safeParse({ title: '' }).success).toBe(false);
  expect(schema.safeParse({ title: 'a'.repeat(200) }).success).toBe(false);
});
```

```ts
// ✅ describe → modul, it → aniq holat
describe('formatMoney', () => {
  it("50000 ni '50 000 so'm' ga aylantiradi", () => { … });
  it("nol qiymatda '0 so'm' qaytaradi", () => { … });
});

// ❌ Tasvirlovsiz test nomi
it("works", () => { … });
it("test 1", () => { … });
```

```ts
// ✅ beforeEach da state tozalash (store testlarida majburiy)
beforeEach(() => {
  useCartStore.setState({ items: [] });
});

// ❌ Testlar orasida state qolishi
```

---

## Admin (Vitest) — import pattern

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
```

## Mobile (Jest) — import pattern

```ts
// global: describe, it, expect, beforeEach — import kerak emas
import { renderHook, waitFor } from '@testing-library/react-native';
```

---

## Edge case'lar — har doim qo'shilsin

Har bir funksiya uchun kamida:
1. **Happy path** — to'g'ri input, kutilgan output
2. **Empty / null** — bo'sh string, null, undefined, bo'sh array
3. **Boundary** — min/max qiymat, eng katta raqam, eng uzun string
4. **Error case** — noto'g'ri tip, validation xatosi, server xatosi

---

## Checklist — test yozib bo'lgandan keyin

- [ ] Test fayli loyiha papkasida (admin: `src/`, mobile: `src/`)
- [ ] `describe` nomi — test qilinayotgan modul nomi
- [ ] Har bir `it` — bitta aniq holat
- [ ] `beforeEach` — global state tozalangan (store testlari uchun)
- [ ] Happy path + edge case'lar mavjud
- [ ] Mock faqat tashqi bog'liqliklar uchun (API, router, SecureStore)
- [ ] Test ishlashini tekshir: `yarn test:run` (admin) yoki `yarn test` (mobile)
