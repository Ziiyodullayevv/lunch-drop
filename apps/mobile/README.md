# Lunch Drop — Mobile

Expo SDK 55 asosidagi mobil ilova. Kompaniya xodimlari tushlik buyurtma qiladi, buyurtma holatini kuzatadi.

## Talablar

- Node.js >= 18
- Expo CLI: `npm install -g expo-cli`
- iOS uchun: Xcode + iOS Simulator
- Android uchun: Android Studio + emulator yoki real qurilma

## O'rnatish va ishga tushirish

```bash
yarn install

yarn ios        # iOS Simulator
yarn android    # Android emulator
yarn start      # Expo Dev Tools (QR kod bilan real qurilma)
```

## Muhit o'zgaruvchilari

`.env` faylini yarating:

```env
# Backend API manzili (majburiy)
EXPO_PUBLIC_API_URL=https://api.lunchdrop.uz/api/v1

# Mock API (development uchun)
EXPO_PUBLIC_USE_MOCK_API=false
```

Real qurilmada test qilganda `localhost` o'rniga kompyuterning lokal IP manzilini kiriting:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000/api/v1
```

## Buyruqlar

```bash
yarn start      # Expo dev server
yarn ios        # iOS simulator
yarn android    # Android emulator
yarn lint       # ESLint tekshiruvi
yarn test       # Testlar (Jest)
yarn test:watch # Watch mode
```

## Papka tuzilmasi

```
src/
├── app/                  # Expo Router — sahifalar (thin shells)
│   ├── (auth)/           # Login, OTP
│   ├── (onboarding)/     # Kompaniya va filial tanlash
│   ├── (tabs)/           # Asosiy tab navigatsiya
│   └── order/[id].tsx    # Dinamik sahifalar
├── features/             # Domain bo'limlari
│   ├── auth/             # Login, OTP ekranlari
│   └── …
├── components/ui/        # Umumiy UI (AppButton, AppCard, Screen…)
├── lib/
│   ├── api/              # Axios fetcher funksiyalar
│   │   ├── client.ts     # Axios instance (401 refresh bilan)
│   │   └── endpoints.ts  # Barcha API yo'llari
│   ├── routes.ts         # Barcha route manzillari
│   └── query-client.ts   # TanStack QueryClient
├── stores/               # Zustand (auth, cart, preferences)
├── hooks/                # Global TanStack Query hooks
├── types/
│   ├── domain.ts         # App tiplari (Order, Kitchen, User…)
│   └── api.ts            # Backend DTO tiplari
└── constants/
    └── theme.ts          # Ranglar, shriftlar, spacing
```

## Ekranlar

| Ekran | Route |
|---|---|
| Login | `/(auth)/login` |
| OTP tasdiqlash | `/(auth)/verify-otp` |
| Kompaniyalar | `/(onboarding)/companies` |
| Filiallar | `/(onboarding)/branches` |
| Bosh sahifa (oshxonalar) | `/(tabs)/home` |
| Mening buyurtmalarim | `/my-orders` |
| Buyurtma tafsiloti | `/order/[id]` |
| Taom tafsiloti | `/food/[id]` |
| Profil | `/account` |

## Arxitektura qarorlari

- **`app/` fayllar — faqat thin shell**: hech qanday logika yo'q, faqat screen komponentini import qiladi
- **Barcha API yo'llari `endpoints.ts` da**: URL stringlar boshqa joyda yozilmaydi
- **Barcha route'lar `routes.ts` da**: `router.push('/order/123')` o'rniga `router.push(routes.order(id))`
- **DTO → Domain `mappers.ts` orqali**: UI kod xom API javoblarini ko'rmaydi

## Texnologiyalar

- **Expo SDK 55** — React Native framework
- **Expo Router v4** — fayl asosidagi navigatsiya
- **Tamagui** — UI komponentlar va design system
- **TanStack Query v5** — server state
- **Zustand** — client state (auth, cart)
- **React Hook Form + Zod** — formalar
- **Axios** — HTTP client (401 auto-refresh bilan)
- **TypeScript 5** — strict mode
- **Jest** — testlar
