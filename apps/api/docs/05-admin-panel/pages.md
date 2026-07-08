# Admin Panel Sahifalari

**Stack:** Next.js App Router + MUI (Minimal template) + TypeScript

Barcha sahifalar `app/dashboard/` ichida. Har bir sahifa `PageRoleGuard` bilan himoyalangan.

---

## Sahifalar ro'yxati

| Yo'l | Sahifa | Ruxsat |
|------|--------|--------|
| `/dashboard` | Asosiy dashboard | Barchasi |
| `/dashboard/company` | Kompaniyalar ro'yxati | `super_admin` |
| `/dashboard/company/new` | Yangi kompaniya | `super_admin` |
| `/dashboard/company/[id]/edit` | Kompaniya tahrirlash | `super_admin` |
| `/dashboard/branch` | Filiallar | `super_admin`, `company_admin` |
| `/dashboard/branch/new` | Yangi filial | `super_admin`, `company_admin` |
| `/dashboard/kitchen` | Oshxonalar | `super_admin`, `company_admin` |
| `/dashboard/kitchen/new` | Yangi oshxona | `super_admin` |
| `/dashboard/kitchen/[id]` | Oshxona detail | `super_admin`, `company_admin`, `kitchen_admin` |
| `/dashboard/kitchen/settings` | Oshxona sozlamalari | `kitchen_admin` |
| `/dashboard/menu` | Menyu boshqaruv | `super_admin`, `company_admin`, `kitchen_admin` |
| `/dashboard/menu/categories` | Kategoriyalar | `super_admin`, `company_admin` |
| `/dashboard/order` | Buyurtmalar | Barchasi |
| `/dashboard/order/[id]` | Buyurtma detail | Barchasi |
| `/dashboard/grouped-order` | Guruhli buyurtmalar | `super_admin`, `company_admin`, `kitchen_admin` |
| `/dashboard/grouped-order/[id]` | Guruhli buyurtma detail | Yuqoridagi |
| `/dashboard/employees/list` | Xodimlar ro'yxati | `super_admin`, `company_admin` |
| `/dashboard/employees/new` | Xodim qo'shish | `super_admin`, `company_admin` |

---

## Menyu sahifasi — `available_days` filtri

`/dashboard/menu` sahifasida hafta kuni filtri mavjud:

- Admin panel `?weekday` ni backendga bermaydi
- O'zi client-side filter qiladi: `item.available_days.includes(filterDay)`
- Bo'lim filtrlari: DayPicker (MUI Select, multi-select) — Dushanba … Yakshanba to'liq nomlari bilan

---

## Komponent tuzilmasi

```
app/dashboard/feature/page.tsx        ← Server Component, metadata, PageRoleGuard
src/sections/feature/view/*-view.tsx  ← 'use client', barcha logika
src/sections/feature/                 ← kichik komponentlar, form, table
```

---

## PageRoleGuard

```tsx
<PageRoleGuard allowedRoles={['super_admin', 'company_admin']}>
  <FeatureView />
</PageRoleGuard>
```

Rol mos kelmasa `/403` ga yo'naltiradi.
