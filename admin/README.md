# Lunch Drop — Admin Panel

Next.js 16 asosidagi boshqaruv paneli. Super admin, kompaniya adminlari va oshxona adminlari uchun.

## Talablar

- Node.js >= 22
- Yarn 1.22+

## O'rnatish va ishga tushirish

```bash
yarn install
yarn dev        # http://localhost:8082
```

## Muhit o'zgaruvchilari

`.env` faylini yarating (`.env` namuna asosida):

```env
# Backend API manzili (majburiy)
NEXT_PUBLIC_SERVER_URL=http://164.90.210.222:8000

# Statik fayllar manzili (ixtiyoriy)
NEXT_PUBLIC_ASSETS_DIR=
```

## Buyruqlar

```bash
yarn dev          # Development server — http://localhost:8082
yarn build        # Production build
yarn start        # Production serverni ishga tushirish
yarn lint         # ESLint tekshiruvi
yarn lint:fix     # ESLint avtomatik tuzatish
yarn tsc:check    # TypeScript tekshiruvi
yarn fix:all      # lint:fix + format:fix
yarn test:run     # Testlarni bir marta ishga tushirish
yarn test         # Watch mode
```

## Papka tuzilmasi

```
src/
├── app/            # Next.js App Router — sahifalar va layoutlar
├── sections/       # Domain bo'limlari (orders/, kitchen/, employees/…)
├── components/     # Umumiy UI komponentlar
├── layouts/        # Dashboard, auth layoutlari
├── auth/           # JWT autentifikatsiya
├── lib/            # axios.ts — API client
├── routes/         # paths.ts — barcha route manzillari
├── types/          # TypeScript tiplari
└── utils/          # format-number.ts, format-time.ts
```

## Asosiy sahifalar

| Sahifa | Manzil |
|---|---|
| Dashboard | `/dashboard` |
| Kompaniyalar | `/dashboard/company` |
| Filiallar | `/dashboard/branch` |
| Oshxonalar | `/dashboard/kitchen` |
| Menyular | `/dashboard/menu` |
| Buyurtmalar | `/dashboard/order` |
| Guruhli buyurtmalar | `/dashboard/grouped-order` |
| Xodimlar | `/dashboard/employees` |

## Rollar

| Rol | Huquqlar |
|---|---|
| `super_admin` | Hamma narsa |
| `company_admin` | O'z kompaniyasi va filiallari |
| `kitchen_admin` | O'z oshxonasi va menyu |

## Texnologiyalar

- **Next.js 16** — App Router, Server Components
- **MUI v9** — UI komponentlar
- **TanStack Query v5** — server state
- **React Hook Form + Zod** — formalar
- **Axios** — HTTP client (JWT interceptor bilan)
- **TypeScript 5** — strict mode
- **Vitest** — testlar
