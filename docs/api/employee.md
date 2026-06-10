# Employee API

Barcha endpoint 🔐 — `Authorization: Bearer <access_token>` (role: `employee`)

Base: `http://164.90.210.222:8000/api/v1`

---

## Kompaniyaga qo'shilish oqimi

```
GET /employee/companies        →  kompaniya + filiallar ro'yxati
POST /employee/join-branch     →  filiallarga qo'shilish so'rovi  →  pending_approval
GET /employee/status           →  so'rov holatini kuzatish
→ company_admin tasdiqlaydi    →  approved
```

---

## Kompaniyalar va filiallar

### `GET /employee/companies`

Mavjud barcha kompaniyalar va ularning filiallari.

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "name": "Karimov Holding",
    "branches": [
      {
        "id": "uuid",
        "name": "Chilonzor filiali",
        "address": "Chilonzor 4",
        "lat": 41.2995,
        "lng": 69.2401
      }
    ]
  }
]
```

---

### `POST /employee/join-branch`

Bir yoki bir nechta filialga qo'shilish so'rovi (bitta kompaniya doirasida).

**Request:**
```json
{ "branch_ids": ["uuid1", "uuid2"] }
```

| Maydon | Shart | Cheklov |
|---|---|---|
| `branch_ids` | ✅ | kamida 1 ta UUID |

**Response `200`:** — `EmployeeStatusRead`

```json
{
  "account_status": "pending_approval",
  "company_id": "uuid",
  "branches": [
    { "id": "uuid", "name": "Chilonzor filiali", "address": "...", "lat": 41.2995, "lng": 69.2401 }
  ]
}
```

---

### `GET /employee/status`

O'z tasdiq holatini tekshirish.

**Response `200`:** — `EmployeeStatusRead`

```json
{
  "account_status": "approved",
  "company_id": "uuid",
  "branches": [
    { "id": "uuid", "name": "Chilonzor filiali", "address": "...", "lat": 41.2995, "lng": 69.2401 }
  ]
}
```

`account_status` — `null` (hali join qilinmagan), `pending_approval`, `approved`, `rejected`, `inactive`

---

## Menyu

### `GET /employee/menu`

Sana bo'yicha bugungi yoki kelgusi kun menyusi.

**Query params:** `?target_date=2024-01-15` (ixtiyoriy, default: bugun, `YYYY-MM-DD`)

**Response `200`:**
```json
{
  "target_date": "2024-01-15",
  "items": [
    {
      "id": "uuid",
      "kitchen_id": "uuid",
      "category_id": "uuid",
      "name": "Osh",
      "description": null,
      "price": "25000.00",
      "image_url": "https://..."
    }
  ]
}
```

---

## Buyurtmalar

### `POST /orders`

Yangi buyurtma berish.

**Request:**
```json
{
  "branch_id": "uuid",
  "kitchen_id": "uuid",
  "meal_id": "uuid",
  "target_date": "2024-01-15"
}
```

| Maydon | Shart | Format |
|---|---|---|
| `branch_id` | ✅ | UUID — xodim qaysi filialni tanlagani |
| `kitchen_id` | ✅ | UUID |
| `meal_id` | ✅ | UUID |
| `target_date` | ✅ | `"YYYY-MM-DD"` |

**Response `201`:** — `OrderRead`

```json
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
  "meal_name": "Osh"
}
```

**`OrderStatus` qiymatlari va O'zbek tarjimasi:**

| Status | Label |
|---|---|
| `created` | Qabul qilindi |
| `preparing` | Tayyorlanmoqda |
| `on_the_way` | Yo'lda |
| `delivered` | Yetkazildi |
| `cancelled` | Bekor qilindi |

Oqim: `created` → `preparing` → `on_the_way` → `delivered` (↘ `cancelled`)

---

### `GET /orders`

Buyurtmalar tarixi (paginated). Kunlik yoki oylik filtr.

**Query params:**

| Param | Shart | Ma'no |
|---|---|---|
| `month` | ❌ | Oylik: `YYYY-MM` (masalan `2026-06`) |
| `target_date` | ❌ | Kunlik: aniq sana `YYYY-MM-DD` |
| `order_status` | ❌ | Status filtri |
| `limit` | ❌ | default: 20 |
| `offset` | ❌ | default: 0 |

**Response `200`:**
```json
{
  "items": [
    {
      "id": "uuid",
      "target_date": "2024-01-15",
      "status": "delivered",
      "status_label": "Yetkazildi",
      "historical_price": "25000.00",
      "system_fee": "1250.00",
      "meal_id": "uuid",
      "meal_name": "Osh",
      "meal_image_url": "https://...",
      "kitchen_id": "uuid",
      "kitchen_name": "Ali's Kitchen",
      "branch_id": "uuid",
      "branch_name": "Chilonzor filiali",
      "created_at": "2024-01-15T09:00:00Z"
    }
  ],
  "total": 30,
  "limit": 20,
  "offset": 0
}
```

---

### `GET /orders/{order_id}`

Buyurtma tafsilotlari — `OrderHistoryItem` formatida (taom va oshxona ma'lumotlari bilan).

**Response `200`:** — `OrderHistoryItem` (yuqoridagi `items` elementi bilan bir xil)

---

### `PATCH /orders/{order_id}/confirm-delivery`

Yetkazib berilganini tasdiqlash (`on_the_way` → `delivered`).

**Response `200`:** — yangilangan `OrderRead`

---

### `POST /orders/{order_id}/cancel`

Buyurtmani bekor qilish.

**Response `200`:** — yangilangan `OrderRead` (`status: "cancelled"`)

---

## Bildirishnomalar

### `GET /notifications`

Xodimning barcha yoki filtrlangan bildirishnomalari.

**Query params:**

| Param | Shart | Ma'no |
|---|---|---|
| `is_read` | ❌ | `true` / `false` — o'qilgan/o'qilmagan filtr |
| `limit` | ❌ | default: 20 |
| `offset` | ❌ | default: 0 |

**Response `200`:**
```json
{
  "items": [
    {
      "id": "uuid",
      "type": "order_status",
      "title": "Buyurtma holati o'zgardi",
      "body": "Buyurtmangiz tayyorlanmoqda",
      "is_read": false,
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 5,
  "limit": 20,
  "offset": 0
}
```

`type` qiymatlari: `order_status`, `cooking`, `ready`, `delivered`, `cancelled`

---

### `GET /notifications/unread-count`

O'qilmagan bildirishnomalar soni.

**Response `200`:**
```json
{ "count": 3 }
```

---

### `PATCH /notifications/{id}/read`

Bitta bildirishnomani o'qildi deb belgilash.

**Response `200`:** — yangilangan `NotificationRead`

---

### `PATCH /notifications/read-all`

Barcha bildirishnomalarni o'qildi deb belgilash.

**Response `200`:**
```json
{ "count": 5 }
```

---

## Fayllar yuklash

### `POST /uploads/image`

Rasm faylini yuklash (`multipart/form-data`).

**Request:** `Content-Type: multipart/form-data`

| Maydon | Shart | Tur |
|---|---|---|
| `file` | ✅ | binary (JPEG, PNG, WebP) |

**Response `200`:**
```json
{ "url": "https://cdn.example.com/uploads/image.jpg" }
```

---

## Frontend endpoints konstantasi

```ts
export const endpoints = {
  employee: {
    companies:       '/employee/companies',
    joinBranch:      '/employee/join-branch',
    status:          '/employee/status',
    menu:            '/employee/menu',
  },
  orders: {
    list:            '/orders',
    create:          '/orders',
    detail:          (id: string) => `/orders/${id}`,
    confirmDelivery: (id: string) => `/orders/${id}/confirm-delivery`,
    cancel:          (id: string) => `/orders/${id}/cancel`,
  },
  notifications: {
    list:            '/notifications',
    unreadCount:     '/notifications/unread-count',
    readAll:         '/notifications/read-all',
    read:            (id: string) => `/notifications/${id}/read`,
  },
  uploads: {
    image:           '/uploads/image',
  },
} as const;
```
