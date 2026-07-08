# API Endpointlar

**Base URL:** `/api/v1`

Barcha endpointlar `Authorization: Bearer <access_token>` talab qiladi (`/auth/*` bundan mustasno).

## Endpoint ro'yxati

| Endpoint | Fayl | Tavsif |
|----------|------|--------|
| `POST /auth/login` | `auth.py` | Admin login (email+password) |
| `POST /auth/otp/send` | `auth.py` | SMS OTP yuborish |
| `POST /auth/otp/verify` | `auth.py` | OTP tasdiqlash, token olish |
| `POST /auth/refresh` | `auth.py` | Access token yangilash |
| `POST /auth/logout` | `auth.py` | Chiqish |
| `GET /auth/me` | `auth.py` | Joriy foydalanuvchi |
| `GET /companies` | `companies.py` | Kompaniyalar ro'yxati |
| `POST /companies` | `companies.py` | Kompaniya yaratish |
| `PATCH /companies/{id}` | `companies.py` | Yangilash |
| `GET /branches` | `branches.py` | Filiallar ro'yxati |
| `POST /branches` | `branches.py` | Filial yaratish |
| `PATCH /branches/{id}` | `branches.py` | Yangilash |
| `GET /kitchens` | `kitchens.py` | Oshxonalar ro'yxati |
| `POST /kitchens` | `kitchens.py` | Oshxona yaratish |
| `PATCH /kitchens/{id}` | `kitchens.py` | Yangilash |
| `GET /kitchens/{id}/menu` | `menu.py` | Menyu (`?weekday=1..7`) |
| `POST /kitchens/{id}/menu` | `menu.py` | Menyu bo'limi yaratish |
| `POST /kitchens/{id}/menu/{mid}/items` | `menu.py` | Taom qo'shish |
| `PATCH /kitchens/{id}/items/{item_id}` | `menu.py` | Taom yangilash |
| `DELETE /kitchens/{id}/items/{item_id}` | `menu.py` | Taom o'chirish (soft) |
| `GET /orders` | `orders.py` | Buyurtmalar ro'yxati |
| `POST /orders` | `orders.py` | Buyurtma berish |
| `GET /orders/me/today` | `orders.py` | Bugungi buyurtmalar |
| `GET /grouped-orders` | `grouped_orders.py` | Guruhli buyurtmalar |
| `PATCH /grouped-orders/{id}/status` | `grouped_orders.py` | Status o'zgartirish |
| `GET /users` | `users.py` | Foydalanuvchilar |
| `POST /users` | `users.py` | Foydalanuvchi yaratish |
| `GET /notifications` | `notifications.py` | Bildirishnomalar |
| `GET /onboarding/kitchens` | `onboarding.py` | Branch uchun oshxonalar |

### Mavjud, lekin batafsil hujjatlanmagan (TODO — spec kerak)

Quyidagi modullar `structure.md`/`schema.md` da bor, lekin request/response spec'i hali yozilmagan. Implementatsiyadan oldin shu yerda hujjatlash kerak:

| Endpoint | Fayl | Holat |
|----------|------|-------|
| `GET/POST /kitchens/{id}/categories`, `PATCH/DELETE .../{cat_id}` | `menu.py`/`categories` | ⚠️ Kategoriya CRUD — `food_categories` jadvali bor, spec yo'q |
| `POST /auth/invite/verify` (yoki `/onboarding/invite`) | `auth.py`/`onboarding.py` | ⚠️ `invite_codes` jadvali + mobile `InviteCodeScreen` bor, endpoint hujjatlanmagan |
| `... /payments` | `payments.py` | ⚠️ `payments` jadvali bor, to'lov oqimi va endpointlari yo'q (`payment_day` bilan bog'liq) |
| `GET /stats/...` | `stats.py` | ⚠️ Statistika/dashboard raqamlari — endpointlar hujjatlanmagan |
| Tag endpointlari | `menu.py` | `menu.md` da bor, bu jadvalga ko'chirilishi kerak |

## Response formatlar

```json
// Ro'yxat (paginated)
{
  "items": [...],
  "total": 42,
  "page": 1,
  "page_size": 20,
  "has_next": true
}

// Xato
{ "detail": "Xato tavsifi" }

// O'chirish
// 204 No Content
```

## Auth oqimi (mobile)

```
1. POST /auth/otp/send     { phone: "+998901234567" }
2. POST /auth/otp/verify   { phone: "...", code: "123456" }
   → { access_token, refresh_token }
3. GET /auth/me            → { user: { id, name, role, branchId, ... } }
```
