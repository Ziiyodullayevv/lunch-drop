# Auth API

Base: `http://164.90.210.222:8000/api/v1`

---

## Admin login

### `POST /auth/admin-login`

`super_admin`, `company_admin`, `kitchen_admin` uchun.

**Request:**
```json
{
  "phone": "+998901234567",
  "password": "parol123"
}
```

| Maydon | Shart | Cheklov |
|---|---|---|
| `phone` | ✅ | — |
| `password` | ✅ | min: 6, max: 128 |

**Response `200`:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

**Xatolar:** `401` noto'g'ri parol, `403` bloklangan

---

## Xodim login (mobil) — 2 bosqich

### 1-bosqich: `POST /auth/send-otp`

Telefonga SMS kod yuboradi.

**Request:**
```json
{ "phone": "+998901234567" }
```

**Response `200`:**
```json
{
  "message": "OTP yuborildi",
  "expires_in": 120
}
```

`expires_in` — soniyalarda.

**Xatolar:** `404` foydalanuvchi topilmadi, `403` bloklangan

---

### 2-bosqich: `POST /auth/employee-login`

**Request:**
```json
{
  "phone": "+998901234567",
  "code": "123456"
}
```

| Maydon | Shart | Cheklov |
|---|---|---|
| `phone` | ✅ | — |
| `code` | ✅ | min: 4, max: 8 |

**Response `200`:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

**Xatolar:** `400` kod noto'g'ri yoki eskirgan

---

## Admin ro'yxatdan o'tish — 3 bosqich

### 1-bosqich: `POST /auth/send-otp`

Yuqoridagi kabi — telefonga SMS kod yuboradi.

---

### 2-bosqich: `POST /auth/verify-otp`

OTP ni tasdiqlaydi va `registration_token` qaytaradi.

**Request:**
```json
{
  "phone": "+998901234567",
  "code": "123456"
}
```

**Response `200`:**
```json
{
  "registration_token": "eyJ...",
  "expires_in": 300
}
```

> `registration_token` — keyingi bosqich uchun, login uchun emas!

---

### 3-bosqich: `POST /auth/admin-register`

Akkaunt yaratadi → `pending_approval` statusiga tushadi.

`kitchen_admin` uchun login/parol aynan shu oqimda yaratiladi. Super adminning
`POST /super-admin/kitchens` endpointi user yoki parol yaratmaydi. Oldindan
yaratilgan oshxonaga mavjud adminni biriktirish kerak bo'lsa,
`PATCH /super-admin/users/{user_id}` dagi `kitchen_id` ishlatiladi.

**Request:**
```json
{
  "registration_token": "eyJ...",
  "role": "kitchen_admin",
  "full_name": "Ali Valiyev",
  "password": "parol123",
  "name": "Ali's Kitchen",
  "description": "Ixtiyoriy tavsif",
  "institution_phone": "+998901234567",
  "lat": 41.2995,
  "lng": 69.2401,
  "billing_day": null
}
```

| Maydon | Shart | Cheklov |
|---|---|---|
| `registration_token` | ✅ | — |
| `role` | ✅ | `kitchen_admin` \| `company_admin` |
| `full_name` | ✅ | min: 1, max: 255 |
| `password` | ✅ | min: 6, max: 128 |
| `name` | ✅ | min: 1, max: 255 (oshxona/kompaniya nomi) |
| `description` | ❌ | — |
| `institution_phone` | ❌ | — |
| `lat` | ❌ | float |
| `lng` | ❌ | float |
| `billing_day` | ❌ | integer, 1–28 |

**Response `200`:**
```json
{
  "message": "Ariza qabul qilindi",
  "account_status": "pending_approval"
}
```

---

## Token yangilash

### `POST /auth/refresh-token`

**Request:**
```json
{ "refresh_token": "eyJ..." }
```

**Response `200`:** — yangi `TokenResponse` (access + refresh)

> Har safar yangi `refresh_token` qaytadi (rotation).

2026-06-11 live tekshiruvda access token muddati `900` soniya (15 daqiqa)
bo'ldi. Token eskirganda himoyalangan endpointlar `401` qaytaradi.

**Xatolar:** `401` refresh token noto'g'ri

---

## Chiqish

### `POST /auth/logout`

**Request:**
```json
{ "refresh_token": "eyJ..." }
```

**Response `204`** — bo'sh.

---

## Joriy foydalanuvchi

### `GET /auth/me` 🔐

**Response `200`:**
```json
{
  "user": {
    "id": "uuid",
    "phone": "+998901234567",
    "name": "Ali Valiyev",
    "role": "kitchen_admin",
    "is_active": true,
    "account_status": "approved",
    "company_id": null,
    "branch_id": null,
    "kitchen_id": "uuid"
  }
}
```

---

### `PATCH /auth/me` 🔐

Joriy foydalanuvchining account profilini yangilaydi. Endpoint
`super_admin`, `company_admin`, `kitchen_admin` va `employee` profillari uchun
bir xil ishlatiladi. Yuborilgan maydonlargina o'zgaradi.

**Request:**
```json
{
  "name": "Ali Valiyev",
  "password": "yangi-parol",
  "avatar_url": "/uploads/avatars/avatar.jpg"
}
```

| Maydon | Shart | Cheklov |
|---|---|---|
| `name` | ixtiyoriy | `string` |
| `password` | ixtiyoriy | `string` |
| `avatar_url` | ixtiyoriy | avval upload qilingan rasm URL'i |

**Response `200`:**
```json
{
  "user": {
    "id": "uuid",
    "phone": "+998901234567",
    "name": "Ali Valiyev",
    "role": "company_admin",
    "is_active": true,
    "account_status": "approved",
    "company_id": "uuid",
    "branch_id": null,
    "kitchen_id": null
  }
}
```

> Bu endpoint foydalanuvchining ismi va/yoki parolini yangilaydi.
> Kompaniya nomi/logo uchun `PATCH /company/me`, oshxona sozlamalari uchun
> `PATCH /kitchen/settings` ishlatiladi.

---

## Frontend endpoints konstantasi

```ts
// src/lib/axios.ts (admin) yoki src/lib/api/endpoints.ts (mobile)
export const endpoints = {
  auth: {
    adminLogin:    '/auth/admin-login',
    employeeLogin: '/auth/employee-login',
    sendOtp:       '/auth/send-otp',
    verifyOtp:     '/auth/verify-otp',
    adminRegister: '/auth/admin-register',
    refreshToken:  '/auth/refresh-token',
    logout:        '/auth/logout',
    me:            '/auth/me',
  },
} as const;
```

---

## Login oqimlari xulosa

```
ADMIN (web):
  POST /auth/admin-login  →  TokenResponse  →  saqlash

XODIM (mobile):
  POST /auth/send-otp
  POST /auth/employee-login  →  TokenResponse  →  saqlash

YANGI ADMIN (ro'yxat):
  POST /auth/send-otp
  POST /auth/verify-otp  →  registration_token
  POST /auth/admin-register  →  pending_approval (super admin kutadi)
```

Real akkauntlar bilan tekshiruv natijalari:
[live-verification.md](./live-verification.md).
