# API Overview

## Base URL

```
http://164.90.210.222:8000/api/v1
```

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
| `inactive` | Faolsizlantrilgan |

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

Barcha ro'yxat endpointlari shu formatda qaytaradi:

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
| Xodim | [employee.md](./employee.md) | `employee` |
