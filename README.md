# Lunch Drop

B2B korporativ tushlik platformasi. Kompaniya xodimlari oshxonalardan ovqat buyurtma qiladi, oshxonalar guruhlab tayyorlaydi va yetkazib beradi.

## Loyiha tuzilmasi

```
lunchdrop/
├── admin/      # Next.js 16 — boshqaruv paneli (super admin, kompaniya admin, oshxona admin)
└── mobile/     # Expo SDK 55 — xodimlar uchun mobil ilova (iOS + Android)
```

## Tezkor ishga tushirish

```bash
# Admin panel
cd admin
yarn install
yarn dev          # http://localhost:8082

# Mobil ilova
cd mobile
yarn install
yarn ios          # iOS simulator
yarn android      # Android emulator
```

## Muhit o'zgaruvchilari

**Admin** — `admin/.env` faylini yarating:
```env
NEXT_SERVER_API_URL=http://164.90.210.222:8000
```

**Mobile** — `mobile/.env` faylini yarating:
```env
EXPO_PUBLIC_API_URL=http://164.90.210.222:8000/api/v1
EXPO_PUBLIC_USE_MOCK_API=false
```

## Texnologiyalar

| | Admin | Mobile |
|---|---|---|
| Framework | Next.js 16 (App Router) | Expo SDK 55 + Expo Router v4 |
| UI | MUI v9 + Emotion | Tamagui |
| Server state | TanStack Query v5 | TanStack Query v5 |
| Client state | — | Zustand + persist |
| HTTP | Axios | Axios |
| Forms | React Hook Form + Zod | React Hook Form + Zod |
| Language | TypeScript 5 | TypeScript 5 |

## Backend

Backend loyihasi alohida repository'da. API docs: `http://localhost:8000/docs`

Default port: `8000`
