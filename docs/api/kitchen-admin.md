# Kitchen Admin API

Barcha endpoint 🔐 — `Authorization: Bearer <access_token>` (role: `kitchen_admin`)

Base: `http://164.90.210.222:8000/api/v1/kitchen`

2026-06-11 live tekshiruv holati:
[live-verification.md](./live-verification.md#kitchen-admin).

---

## Dashboard

### `GET /kitchen/dashboard?year=2026`

Token egasining oshxonasi bo'yicha statistika va tanlangan yilning oylik
analytics ma'lumotlari.

| Query | Shart | Ma'no |
|---|---|---|
| `year` | ixtiyoriy | Oylik chart yili. Berilmasa joriy yil olinadi. |

OpenAPI response'i `DashboardResponse` modeliga ulangan. 2026-06-14 live
tekshiruvda 6 ta summary karta, har biri uchun 8 ta history nuqtasi, barcha
statuslar va 12 oylik qatorlar qaytdi:
[live-verification.md](./live-verification.md#dashboard-analytics-openapi).

---

## Oshxona profili

### `GET /kitchen/me`

O'z oshxona ma'lumotlari.

**Response `200`:**
```json
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
```

---

### `PATCH /kitchen/settings`

Oshxona sozlamalarini yangilash (barcha maydonlar ixtiyoriy).

**Request:**
```json
{
  "name": "Yangi nom",
  "description": "...",
  "phone": "+998901234567",
  "order_cutoff_time": "10:00:00",
  "delivery_start_time": "12:00:00",
  "delivery_end_time": "13:00:00",
  "is_active": true
}
```

> Lokatsiya (`lat`/`lng`) faqat super_admin tomonidan o'zgartiriladi.

**Response `200`:** — yangilangan `KitchenRead`

---

## Kategoriyalar

### `GET /kitchen/categories`

Oshxonaning barcha kategoriyalari.

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "kitchen_id": "uuid",
    "name": "Sho'rvalar"
  }
]
```

---

### `POST /kitchen/categories`

**Request:**
```json
{ "name": "Sho'rvalar" }
```

| Maydon | Shart | Cheklov |
|---|---|---|
| `name` | ✅ | min: 1, max: 255 |

**Response `201`:** — `MenuCategoryRead`

> Category uchun alohida update/delete endpoint mavjud emas.

---

## Taomlar

### `GET /kitchen/meals`

**Query params:** `?limit=20&offset=0`

**Response `200`:**
```json
{
  "items": [
    {
      "id": "uuid",
      "kitchen_id": "uuid",
      "category_id": "uuid",
      "name": "Osh",
      "description": null,
      "price": "25000.00",
      "image_url": null,
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 30,
  "limit": 20,
  "offset": 0
}
```

---

### `POST /kitchen/meals`

**Request:**
```json
{
  "name": "Osh",
  "price": 25000,
  "description": null,
  "image_url": null,
  "category_id": null
}
```

| Maydon | Shart | Cheklov |
|---|---|---|
| `name` | ✅ | min: 1, max: 255 |
| `price` | ✅ | `> 0` |
| `description` | ❌ | — |
| `image_url` | ❌ | max: 512 |
| `category_id` | ❌ | UUID |

**Response `201`:** — `MealRead`

---

### `GET /kitchen/meals/{meal_id}`

**Response `200`:** — `MealRead`

---

### `PATCH /kitchen/meals/{meal_id}`

Barcha maydonlar ixtiyoriy.

**Request:**
```json
{
  "name": "Yangilangan Osh",
  "price": 30000,
  "description": "...",
  "image_url": null,
  "category_id": null
}
```

**Response `200`:** — yangilangan `MealRead`

---

### `DELETE /kitchen/meals/{meal_id}`

Soft delete — taom o'chiriladi.

**Response `204`** — bo'sh.

---

### `POST /kitchen/meals/{meal_id}/image`

Rasm yuklash (S3). `multipart/form-data` formatida.

**Request:** `file` — image MIME turidagi binary fayl (`image/png`, `image/jpeg`, ...)

**Response `200`:** — yangilangan `MealRead` (`image_url` to'ldirilgan holda)

---

## Menyu jadvali

### `POST /kitchen/schedule-menu`

Taomni hafta kuniga yoki aniq sanaga qo'yish.

**Request:**
```json
{
  "meal_id": "uuid",
  "day_of_week": 1,
  "specific_date": null
}
```

| Maydon | Shart | Cheklov |
|---|---|---|
| `meal_id` | ✅ | UUID |
| `day_of_week` | ❌ | 1–7 (1=Dushanba) |
| `specific_date` | ❌ | `"YYYY-MM-DD"` |

> `day_of_week` yoki `specific_date` dan biri berilishi kerak.

**Response `201`:** — `MenuScheduleRead`

```json
{
  "id": "uuid",
  "meal_id": "uuid",
  "day_of_week": 1,
  "specific_date": null,
  "effective_day_of_week": 1
}
```

`effective_day_of_week` — frontend uchun hisoblangan hafta kuni (Dushanba = 1,
Yakshanba = 7). `day_of_week` bo'lmasa, qiymat `specific_date` dan olinadi.

---

### `GET /kitchen/schedules`

**Query params:** `?meal_id=<uuid>` (ixtiyoriy filtr)

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "meal_id": "uuid",
    "day_of_week": 1,
    "specific_date": null,
    "effective_day_of_week": 1
  }
]
```

---

### `DELETE /kitchen/schedules/{schedule_id}`

Jadvaldan olib tashlash.

**Response `204`** — bo'sh.

---

## Buyurtmalar

### `GET /kitchen/orders`

**Query params:** `?target_date=2024-01-15` (ixtiyoriy, `YYYY-MM-DD`)

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "employee_id": "uuid",
    "kitchen_id": "uuid",
    "meal_id": "uuid",
    "target_date": "2024-01-15",
    "historical_price": "25000.00",
    "system_fee": "1250.00",
    "status": "created",
    "created_at": "2024-01-15T09:00:00Z",
    "employee_name": "Jasur Toshmatov",
    "branch_id": "uuid",
    "branch_name": "Chilonzor filiali",
    "company_id": "uuid",
    "company_name": "Karimov Holding",
    "kitchen_name": "Ali's Kitchen",
    "meal_name": "Osh"
  }
]
```

**`OrderStatus` qiymatlari:** `created` → `preparing` → `on_the_way` → `delivered` (↘ `cancelled`)

---

### `GET /kitchen/orders/{order_id}`

Oshxonaga tegishli bitta buyurtma tafsilotlarini qaytaradi.

**Response `200`:** — `OrderRead` (yuqoridagi ro'yxat elementi bilan bir xil)

---

### `PATCH /kitchen/orders/{order_id}/status`

**Request:**
```json
{ "status": "preparing" }
```

| Status | Amal |
|---|---|
| `preparing` | Tayyorlanmoqda |
| `on_the_way` | Yo'lda |
| `delivered` | Yetkazildi |
| `cancelled` | Bekor |

**Response `200`:** — yangilangan `OrderRead`

---

## Frontend endpoints konstantasi

```ts
export const endpoints = {
  kitchen: {
    dashboard:      '/kitchen/dashboard',
    me:             '/kitchen/me',
    settings:       '/kitchen/settings',
    categories:     '/kitchen/categories',
    meals:          '/kitchen/meals',
    meal:           (id: string) => `/kitchen/meals/${id}`,
    mealImage:      (id: string) => `/kitchen/meals/${id}/image`,
    scheduleMenu:   '/kitchen/schedule-menu',
    schedules:      '/kitchen/schedules',
    schedule:       (id: string) => `/kitchen/schedules/${id}`,
    orders:         '/kitchen/orders',
    order:          (id: string) => `/kitchen/orders/${id}`,
    orderStatus:    (id: string) => `/kitchen/orders/${id}/status`,
  },
} as const;
```
