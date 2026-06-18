# Company Admin API

Barcha endpoint 🔐 — `Authorization: Bearer <access_token>` (role: `company_admin`)

Base: `http://164.90.210.222:8000/api/v1/company`

2026-06-11 live tekshiruv holati:
[live-verification.md](./live-verification.md#company-admin).

---

## Dashboard

### `GET /company/dashboard?year=2026`

Token egasining kompaniyasi bo'yicha statistika va tanlangan yilning oylik
analytics ma'lumotlari.

| Query | Shart | Ma'no |
|---|---|---|
| `year` | ixtiyoriy | Oylik chart yili. Berilmasa joriy yil olinadi. |

OpenAPI response'i `DashboardResponse` modeliga ulangan. 2026-06-14 live
tekshiruvda 6 ta summary karta, har biri uchun 8 ta history nuqtasi, barcha
statuslar va 12 oylik qatorlar qaytdi:
[live-verification.md](./live-verification.md#dashboard-analytics-openapi).

---

## Kompaniya profili

### `GET /company/me`

O'z kompaniya ma'lumotlari.

**Response `200`:**
```json
{
  "id": "uuid",
  "name": "Karimov Holding",
  "description": "...",
  "logo_url": null,
  "billing_day": 25,
  "created_at": "2024-01-15T10:00:00Z"
}
```

---

### `PATCH /company/me`

Kompaniya ma'lumotlarini yangilash (barcha maydonlar ixtiyoriy).

**Request:**
```json
{
  "name": "Yangi nom",
  "description": "...",
  "logo_url": "https://...",
  "billing_day": 1
}
```

**Response `200`:** — yangilangan `CompanyRead`

---

## Filiallar

### `GET /company/branches`

**Query params:** `?limit=20&offset=0`

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

### `POST /company/branches`

Kompaniyaga yangi filial qo'shish. `company_id` token'dan avtomatik olinadi.

**Request:**
```json
{
  "name": "Yunusobod filiali",
  "address": "Yunusobod 1",
  "lat": 41.3111,
  "lng": 69.2799
}
```

| Maydon | Shart | Cheklov |
|---|---|---|
| `name` | ✅ | min: 1, max: 255 |
| `address` | ✅ | min: 1 |
| `lat` | ✅ | float |
| `lng` | ✅ | float |

**Response `201`:** — `BranchRead`

---

### `GET /company/branches/{branch_id}`

**Response `200`:** — `BranchRead`

---

### `PATCH /company/branches/{branch_id}`

Barcha maydonlar ixtiyoriy.

**Response `200`:** — yangilangan `BranchRead`

---

### `DELETE /company/branches/{branch_id}`

Soft delete.

**Response `204`** — bo'sh.

---

## Oshxonalar

### `GET /company/kitchens`

Filialga biriktirish mumkin bo'lgan barcha faol oshxonalar.

**Query params:** `?limit=50&offset=0`

**Response `200`:** — `Page<KitchenRead>`

Admin panel barcha sahifalarni yuklaydi va har bir filial uchun
`GET /company/branches/{branch_id}/kitchens` javobi bilan bog'lanishlarni
yig'adi. Shu asosda oshxonalarni filial bo'yicha filtrlash, ulangan/mavjud
holatini ko'rsatish va oshxona, filial, telefon yoki ID bo'yicha qidirish
ishlaydi.

Oshxonani filialga ulash yoki uzish
`POST /company/branches/{branch_id}/assign-kitchens` orqali filialning to'liq
oshxonalar ro'yxatini saqlash bilan bajariladi; oshxonaning `is_active` holati
o'zgartirilmaydi.

---

### `GET /company/branches/{branch_id}/kitchens`

Filialga biriktirilgan oshxonalar ro'yxati.

**Response `200`:**
```json
[
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
]
```

---

### `POST /company/branches/{branch_id}/assign-kitchens`

Filialga oshxonalar biriktirish. Eski ro'yxat to'liq almashtiriladi.

**Request:**
```json
{
  "kitchen_ids": ["uuid1", "uuid2"]
}
```

**Response `200`:** — biriktirilgan `KitchenRead[]`

---

## Xodimlar

> `POST /company/employees` va `POST /super-admin/employees` mavjud emas.
> Xodim mobil ilovada OTP bilan kiradi, `POST /employee/join-branch` orqali
> qo'shilish so'rovi yuboradi va company admin quyidagi status endpointi orqali
> uni tasdiqlaydi.

### `GET /company/employees`

Barcha xodimlar, ixtiyoriy status filtri bilan.

**Query params:** `?account_status=approved&limit=20&offset=0`

| `account_status` | Ma'no |
|---|---|
| `pending_approval` | Tasdiqlash kutilmoqda |
| `approved` | Tasdiqlangan |
| `rejected` | Rad etilgan |
| `inactive` | Faolsizlashtirilgan |

**Response `200`:** — `Page<UserRead>`

---

### `GET /company/employees/pending`

`pending_approval` statusdagi xodimlar — tasdiqlash navbati.

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "phone": "+998901234567",
    "name": "Bobur Toshmatov",
    "branches": ["uuid1", "uuid2"],
    "account_status": "pending_approval",
    "created_at": "2024-01-15T10:00:00Z"
  }
]
```

> `branches` — xodim qo'shilishni so'ragan filiallar ID lari.

---

### `PATCH /company/employees/{employee_id}/status`

Xodim holatini o'zgartirish.

**Request:**
```json
{ "status": "approved" }
```

| `status` qiymati | Ma'no |
|---|---|
| `approved` | Tasdiqlash |
| `rejected` | Rad etish |
| `inactive` | Faolsizlashtirish |

**Response `200`:** — `UserRead`

---

## Buyurtmalar

### `GET /company/orders`

Kompaniyaning barcha buyurtmalari.

**Query params:** `?target_date=2024-01-15&order_status=delivered&limit=50&offset=0`

| Param | Shart | Ma'no |
|---|---|---|
| `target_date` | ❌ | `YYYY-MM-DD` — aniq kun filtri |
| `order_status` | ❌ | `created` / `preparing` / `on_the_way` / `delivered` / `cancelled` |
| `limit` | ❌ | default: 50 |
| `offset` | ❌ | default: 0 |

**Response `200`:** — `Page<OrderRead>`

---

### `GET /company/orders/{order_id}`

Kompaniyaga tegishli bitta buyurtma tafsilotlarini qaytaradi.

**Response `200`:** — `OrderRead`

`OrderRead` taom, oshxona, filial, kompaniya va xodim nomlarini ham qaytarishi
mumkin: `meal_name`, `kitchen_name`, `branch_name`, `company_name`,
`employee_name`.

---

### `PATCH /company/orders/bulk-confirm`

Bugungi barcha `on_the_way` statusdagi buyurtmalarni `delivered` ga o'tkazish.

**Response `200`:**
```json
{ "confirmed": 42 }
```

`confirmed` — holati o'zgartirilgan buyurtmalar soni.

---

## Hisob-fakturalar

### `GET /company/invoices`

Kompaniyaning barcha invoicelar ro'yxati.

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "company_id": "uuid",
    "period_start": "2024-01-01",
    "period_end": "2024-01-31",
    "total_company_expense": "2500000.00",
    "total_system_fee": "125000.00",
    "total_kitchen_profit": "2375000.00",
    "status": "pending",
    "created_at": "2024-02-01T00:00:00Z"
  }
]
```

**`InvoiceStatus` qiymatlari:** `pending` | `paid`

---

## Frontend endpoints konstantasi

```ts
export const endpoints = {
  company: {
    dashboard:        '/company/dashboard',
    me:               '/company/me',
    branches:         '/company/branches',
    branch:           (id: string) => `/company/branches/${id}`,
    branchKitchens:   (id: string) => `/company/branches/${id}/kitchens`,
    assignKitchens:   (id: string) => `/company/branches/${id}/assign-kitchens`,
    kitchens:         '/company/kitchens',
    employees:        '/company/employees',
    pendingEmployees: '/company/employees/pending',
    employeeStatus:   (id: string) => `/company/employees/${id}/status`,
    orders:           '/company/orders',
    order:            (id: string) => `/company/orders/${id}`,
    bulkConfirm:      '/company/orders/bulk-confirm',
    invoices:         '/company/invoices',
  },
} as const;
```
