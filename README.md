# Lunch Drop

B2B korporativ tushlik platformasi. Kompaniya xodimlari oshxonalardan ovqat buyurtma qiladi, oshxonalar guruhlab tayyorlaydi va yetkazib beradi.

## Loyiha tuzilmasi

```
lunchdrop/
├── apps/
│   ├── web/        # Next.js 16 — admin web panel
│   ├── mobile/     # Expo SDK 55 — xodimlar mobil ilovasi
│   └── api/        # FastAPI backend + Telegram notifier
├── docs/           # umumiy loyiha hujjatlari
└── infra/          # deployment compose fayllari: api.yml, web.yml
```

## Tezkor ishga tushirish

```bash
# Admin panel
cd apps/web
yarn install
yarn dev          # http://localhost:8082

# Backend
cd apps/api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload  # http://localhost:8000

# Mobil ilova
cd apps/mobile
yarn install
yarn ios          # iOS simulator
yarn android      # Android emulator
```

## Muhit o'zgaruvchilari

**Web** — `apps/web/.env` faylini yarating:
```env
NEXT_SERVER_API_URL=http://164.90.210.222:8000
```

**API** — `apps/api/.env` faylini yarating:
```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/lunchdrop
JWT_PRIVATE_KEY_PATH=keys/private.pem
JWT_PUBLIC_KEY_PATH=keys/public.pem
```

**Mobile** — `apps/mobile/.env` faylini yarating:
```env
EXPO_PUBLIC_API_URL=http://164.90.210.222:8000/api/v1
EXPO_PUBLIC_USE_MOCK_API=false
```

## Texnologiyalar

| | Web | API | Mobile |
|---|---|---|---|
| Framework | Next.js 16 (App Router) | FastAPI | Expo SDK 55 + Expo Router v4 |
| UI | MUI v9 + Emotion | — | Tamagui |
| Server state | TanStack Query v5 | SQLAlchemy 2 async | TanStack Query v5 |
| Client state | — | PostgreSQL + Alembic | Zustand + persist |
| HTTP | Axios | Uvicorn | Axios |
| Forms | React Hook Form + Zod | Pydantic | React Hook Form + Zod |
| Language | TypeScript 5 | Python 3.13 | TypeScript 5 |

## Backend

Backend endi monorepo ichida: `apps/api`.

API docs: `http://localhost:8000/docs`
Default port: `8000`

## CI/CD

- Web: `.github/workflows/web-ci.yml` va `.github/workflows/web-cd.yml`
- API: `.github/workflows/api-ci.yml` va `.github/workflows/api-cd.yml`
- Production compose fayllari: `infra/web.yml`, `infra/api.yml`

API deploy serverda `/opt/lunchdrop-api/.env`, `/opt/lunchdrop-api/keys/private.pem` va
`/opt/lunchdrop-api/keys/public.pem` mavjud bo'lishini kutadi.
