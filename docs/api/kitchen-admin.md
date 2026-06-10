# Kitchen Admin API

Barcha endpoint 🔐 — `Authorization: Bearer <access_token>` (role: `kitchen_admin`)

Base: `http://164.90.210.222:8000/api/v1/kitchen`

---

## Dashboard

### `GET /kitchen/dashboard`

Oshxona statistikasi (tarkib aniqlanmagan — dynamic object).

**Response `200`:** — statistika ob'ekti

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

**Request:** `file` — binary fayl

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
  "specific_date": null
}
```

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
    "specific_date": null
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
    "created_at": "2024-01-15T09:00:00Z"
  }
]
```

**`OrderStatus` qiymatlari:** `created` → `preparing` → `on_the_way` → `delivered` (↘ `cancelled`)

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
    orderStatus:    (id: string) => `/kitchen/orders/${id}/status`,
  },
} as const;
```
