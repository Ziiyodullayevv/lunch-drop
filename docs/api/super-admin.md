# Super Admin API

Barcha endpoint 🔐 — `Authorization: Bearer <access_token>` (role: `super_admin`)

Base: `http://164.90.210.222:8000/api/v1/super-admin`

---

## Dashboard

### `GET /super-admin/dashboard`

Umumiy statistika.

**Response `200`:** — statistika ob'ekti (tarkib aniqlanmagan)

---

## Kompaniyalar

### `GET /super-admin/companies`

**Query params:** `?limit=20&offset=0`

**Response `200`:**
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Karimov Holding",
      "description": "...",
      "logo_url": null,
      "billing_day": 25,
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 50,
  "limit": 20,
  "offset": 0
}
```

---

### `POST /super-admin/companies`

**Request:**
```json
{
  "name": "Yangi Kompaniya",
  "description": null,
  "logo_url": null,
  "billing_day": 25
}
```

| Maydon | Shart | Cheklov |
|---|---|---|
| `name` | ✅ | min: 1, max: 255 |
| `description` | ❌ | — |
| `logo_url` | ❌ | max: 512 |
| `billing_day` | ❌ | 1–28, default: 1 |

**Response `201`:** — `CompanyRead`

---

### `GET /super-admin/companies/{company_id}`

**Response `200`:** — `CompanyRead`

---

### `PATCH /super-admin/companies/{company_id}`

**Request** (barcha maydonlar ixtiyoriy):
```json
{
  "name": "Yangilangan nom",
  "description": "...",
  "logo_url": "https://...",
  "billing_day": 1
}
```

**Response `200`:** — yangilangan `CompanyRead`

---

### `DELETE /super-admin/companies/{company_id}`

**Response `204`** — bo'sh.

---

## Oshxonalar

### `GET /super-admin/kitchens`

**Query params:** `?limit=20&offset=0`

**Response `200`:**
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Ali's Kitchen",
      "description": null,
      "phone": "+998901234567",
      "lat": 41.2995,
      "lng": 69.2401,
      "order_cutoff_time": "10:00:00",
      "delivery_start_time": "12:00:00",
      "delivery_end_time": "13:00:00",
      "is_active": true,
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 10,
  "limit": 20,
  "offset": 0
}
```

---

### `POST /super-admin/kitchens`

**Request:**
```json
{
  "name": "Yangi Oshxona",
  "lat": 41.2995,
  "lng": 69.2401,
  "description": null,
  "phone": null,
  "order_cutoff_time": "10:00:00",
  "delivery_start_time": "12:00:00",
  "delivery_end_time": "13:00:00",
  "is_active": true
}
```

| Maydon | Shart | Cheklov |
|---|---|---|
| `name` | ✅ | min: 1, max: 255 |
| `lat` | ✅ | float |
| `lng` | ✅ | float |
| `description` | ❌ | — |
| `phone` | ❌ | — |
| `order_cutoff_time` | ❌ | `"HH:MM:SS"` |
| `delivery_start_time` | ❌ | `"HH:MM:SS"` |
| `delivery_end_time` | ❌ | `"HH:MM:SS"` |
| `is_active` | ❌ | boolean |

**Response `201`:** — `KitchenRead`

---

### `GET /super-admin/kitchens/{kitchen_id}`

**Response `200`:** — `KitchenRead`

---

### `PATCH /super-admin/kitchens/{kitchen_id}`

Barcha maydonlar ixtiyoriy — faqat o'zgartirmoqchi bo'lganlarini yuboring.

**Response `200`:** — yangilangan `KitchenRead`

---

### `DELETE /super-admin/kitchens/{kitchen_id}`

**Response `204`** — bo'sh.

---

## Filiallar

### `GET /super-admin/branches`

**Query params:** `?limit=20&offset=0&company_id=<uuid>` (`company_id` — ixtiyoriy filtr)

**Response `200`:**
```json
{
  "items": [
    {
      "id": "uuid",
      "company_id": "uuid",
      "name": "Chilonzor filiali",
      "address": "Chilonzor 4",
      "lat": 41.2995,
      "lng": 69.2401,
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 5,
  "limit": 20,
  "offset": 0
}
```

---

### `POST /super-admin/branches`

**Request:**
```json
{
  "company_id": "uuid",
  "name": "Yangi Filial",
  "address": "Toshkent, Yunusobod 1",
  "lat": 41.3111,
  "lng": 69.2799
}
```

| Maydon | Shart | Cheklov |
|---|---|---|
| `company_id` | ✅ | UUID |
| `name` | ✅ | min: 1, max: 255 |
| `address` | ✅ | min: 1 |
| `lat` | ✅ | float |
| `lng` | ✅ | float |

**Response `201`:** — `BranchRead`

---

### `GET /super-admin/branches/{branch_id}`

**Response `200`:** — `BranchRead`

---

### `PATCH /super-admin/branches/{branch_id}`

Barcha maydonlar ixtiyoriy.

**Response `200`:** — yangilangan `BranchRead`

---

### `DELETE /super-admin/branches/{branch_id}`

**Response `204`** — bo'sh.

---

### `POST /super-admin/branches/{branch_id}/assign-kitchens`

Filialni oshxonalarga ulash.

**Request:**
```json
{
  "kitchen_ids": ["uuid1", "uuid2"]
}
```

**Response `204`** — bo'sh.

---

## Admin arizalar

### `GET /super-admin/pending-admins`

`pending_approval` statusdagi `kitchen_admin` va `company_admin` arizalari.

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "full_name": "Ali Valiyev",
    "phone": "+998901234567",
    "role": "kitchen_admin",
    "account_status": "pending_approval",
    "entity_name": "Ali's Kitchen",
    "created_at": "2024-01-15T10:00:00Z"
  }
]
```

---

### `PATCH /super-admin/admins/{user_id}/approve`

Arizani tasdiqlaydi → `approved`.

**Response `200`:** — `UserRead`

---

### `PATCH /super-admin/admins/{user_id}/reject`

Arizani rad etadi → `rejected`.

**Response `200`:** — `UserRead`

---

## Foydalanuvchilar

### `GET /super-admin/users`

**Query params:**

| Param | Shart | Ma'no |
|---|---|---|
| `role` | ❌ | `super_admin` / `kitchen_admin` / `company_admin` / `employee` |
| `account_status` | ❌ | `pending_approval` / `approved` / `rejected` / `inactive` |
| `search` | ❌ | Telefon yoki ism bo'yicha qidiruv |
| `limit` | ❌ | default: 20 |
| `offset` | ❌ | default: 0 |

**Response `200`:**
```json
{
  "items": [
    {
      "id": "uuid",
      "phone": "+998901234567",
      "name": "Ali Valiyev",
      "role": "kitchen_admin",
      "is_active": true,
      "account_status": "approved",
      "company_id": null,
      "kitchen_id": "uuid",
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 100,
  "limit": 20,
  "offset": 0
}
```

---

### `GET /super-admin/users/{user_id}`

**Response `200`:** — `UserAdminRead`

---

### `PATCH /super-admin/users/{user_id}`

**Request** (barcha maydonlar ixtiyoriy):
```json
{
  "name": "Yangi ism",
  "phone": "+998901234567",
  "role": "company_admin",
  "account_status": "inactive",
  "is_active": false,
  "company_id": "uuid",
  "kitchen_id": null
}
```

**Response `200`:** — yangilangan `UserAdminRead`

---

### `DELETE /super-admin/users/{user_id}`

Foydalanuvchini soft delete qilish.

**Response `204`** — bo'sh.

---

## Frontend endpoints konstantasi

```ts
export const endpoints = {
  // ...auth...
  superAdmin: {
    dashboard:      '/super-admin/dashboard',
    companies:      '/super-admin/companies',
    company:        (id: string) => `/super-admin/companies/${id}`,
    kitchens:       '/super-admin/kitchens',
    kitchen:        (id: string) => `/super-admin/kitchens/${id}`,
    branches:       '/super-admin/branches',
    branch:         (id: string) => `/super-admin/branches/${id}`,
    assignKitchens: (id: string) => `/super-admin/branches/${id}/assign-kitchens`,
    pendingAdmins:  '/super-admin/pending-admins',
    approveAdmin:   (id: string) => `/super-admin/admins/${id}/approve`,
    rejectAdmin:    (id: string) => `/super-admin/admins/${id}/reject`,
    users:          '/super-admin/users',
    user:           (id: string) => `/super-admin/users/${id}`,
  },
} as const;
```
