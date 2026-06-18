# API Overview

## Base URL

```
http://164.90.210.222:8000/api/v1
```

Swagger UI: `http://164.90.210.222:8000/docs`

OpenAPI schema: `http://164.90.210.222:8000/api/v1/openapi.json`

Yandex kuryer integratsiyasi uchun backend kontrakti:
[yandex-delivery.md](./yandex-delivery.md).

Oxirgi OpenAPI tekshiruvi: `2026-06-13` (`OpenAPI 3.1.0`, API version `0.1.0`)

---

## Health check

Bu endpointlar public, token talab qilmaydi.

### `GET /api/v1/health`

Ilova ishlayotganini tekshiradi. Database holatini tekshirmaydi.

**Response `200`:**
```json
{
  "status": "ok",
  "app": "LunchDrop",
  "env": "production"
}
```

### `GET /api/v1/health/db`

PostgreSQL ulanishini tekshiradi.

**Response `200`:**
```json
{
  "status": "ok",
  "database": "up"
}
```

---

## Autentifikatsiya

Himoyalangan endpointlar `Authorization` header talab qiladi:

```
Authorization: Bearer <access_token>
```

---

## Rollar

| Rol | Kirish usuli |
|---|---|
| `super_admin` | telefon + parol (`/auth/admin-login`) |
| `company_admin` | telefon + parol (`/auth/admin-login`) |
| `kitchen_admin` | telefon + parol (`/auth/admin-login`) |
| `employee` | telefon + OTP (`/auth/send-otp` → `/auth/employee-login`) |

## Foydalanuvchi holatlari (`AccountStatus`)

| Status | Ma'no |
|---|---|
| `pending_approval` | Super admin tasdig'i kutilmoqda |
| `approved` | Tasdiqlangan / faol |
| `rejected` | Rad etilgan |
| `inactive` | Faolsizlantirilgan |

---

## Token ishlash tartibi

```
Login / OTP verify  →  access_token + refresh_token
Har so'rovda        →  Authorization: Bearer <access_token>
Token eskirganda    →  POST /auth/refresh-token  →  yangi juftlik
Chiqishda           →  POST /auth/logout
```

---

## Pagination formati

Paginated ro'yxat endpointlari shu formatda qaytaradi:

```json
{
  "items": [...],
  "total": 100,
  "limit": 20,
  "offset": 0
}
```

Query params: `?limit=20&offset=0`

---

## Dashboard analytics

Admin dashboardlari role bo'yicha alohida endpointdan olinadi:

| Rol | Endpoint |
|---|---|
| `super_admin` | `GET /super-admin/dashboard?year=2026` |
| `company_admin` | `GET /company/dashboard?year=2026` |
| `kitchen_admin` | `GET /kitchen/dashboard?year=2026` |

`year` ixtiyoriy integer bo'lib, oylik chart yilini tanlaydi. Berilmasa backend
joriy yilni ishlatadi.

OpenAPI uchala endpointni `DashboardResponse` modeliga ulaydi. Modelda
`summary`, `order_status_totals`, `monthly_orders`, `timezone` va
`generated_at` mavjud. Eski statik dashboard bilan amaldagi backend mosligi:

| Statik UI qismi | Backend holati | Moslik |
|---|---|---|
| Super admin 3 ta asosiy karta | Aylanma yo'q; umumiy buyurtma va faol kompaniya faqat qisman mos | Qisman |
| Company admin 3 ta karta | Oylik xarajat yo'q; qolgan 2 karta qisman mos | Qisman |
| Kitchen admin 3 ta karta | Bugungi porsiya mos; haftalik tushum va kompaniyalar yo'q | Qisman |
| Mavjud summary trend va mini-chartlari | Har bir qaytgan kartada `trend_percent` va 8 ta history nuqtasi bor | Mos |
| Donutdagi delivered/cancelled | Barcha statuslar, jumladan nol qiymatlar live qaytdi | Mos |
| 3 yillik oylik chart | 2024-2026 uchun delivered/cancelled 12 tadan live qaytdi | Mos |

Backend biznes metrikalar bo'yicha to'liq mos kelmagani uchun frontend
dashboard yangi contractga ulanmagan va oldingi holatiga qaytarilgan.

To'liq solishtirish va backendga kerakli qo'shimcha keylar:
[dashboard-contract.md](./dashboard-contract.md).

---

## Xato formati

### Validatsiya xatosi `422`
```json
{
  "detail": [
    { "loc": ["body", "phone"], "msg": "Field required", "type": "missing" }
  ]
}
```

### Umumiy xato `400 / 401 / 403 / 404`
```json
{ "detail": "Xato matni" }
```

| Kod | Ma'no |
|---|---|
| `400` | Noto'g'ri ma'lumot |
| `401` | Token yo'q yoki eskirgan |
| `403` | Ruxsat yo'q |
| `404` | Topilmadi |
| `422` | Validatsiya xatosi |

---

## Bo'limlar

| Bo'lim | Fayl | Rollar |
|---|---|---|
| Autentifikatsiya | [auth.md](./auth.md) | Hammasi |
| Super Admin | [super-admin.md](./super-admin.md) | `super_admin` |
| Kitchen Admin | [kitchen-admin.md](./kitchen-admin.md) | `kitchen_admin` |
| Company Admin | [company-admin.md](./company-admin.md) | `company_admin` |
| Dashboard kontrakti | [dashboard-contract.md](./dashboard-contract.md) | Admin rollari |
| Xodim | [employee.md](./employee.md) | `employee` |
| Live tekshiruv | [live-verification.md](./live-verification.md) | Admin rollari |
