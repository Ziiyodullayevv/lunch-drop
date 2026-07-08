# Menu & Food Items API

**Prefix:** `/api/v1/kitchens/{kitchen_id}/menu`

---

## GET `/menu` — Menyu olish

Barcha menyu bo'limlari va ulardagi taomlar.

| Query param | Type | Tavsif |
|-------------|------|--------|
| `weekday` | `int` (1–7) | ISO hafta kuni: 1=Dushanba … 7=Yakshanba. Ko'rsatilmasa — barcha kunlar |

`weekday` berilsa, faqat `available_days` ichida shu kun bor taomlar qaytariladi. Filter backend Python qatlamida bajariladi.

**Role:** Barcha (employee ham)

**Response:**
```json
{
  "menus": [
    {
      "id": "uuid",
      "title": "Tushlik",
      "sort_order": 0,
      "active": true,
      "food_items": [
        {
          "id": "uuid",
          "name": "Osh",
          "price": 30000,
          "image_url": "https://...",
          "available": true,
          "available_days": [1, 2, 3, 4, 5],
          "is_halal": true,
          "weight_grams": 350,
          "calories": 520
        }
      ]
    }
  ]
}
```

**Misol:**
```
GET /kitchens/abc/menu           → barcha taomlar (admin panel)
GET /kitchens/abc/menu?weekday=1 → faqat dushanbadagi taomlar (ilova)
GET /kitchens/abc/menu?weekday=7 → faqat yakshandagi taomlar
```

---

## POST `/menu` — Menyu bo'limi yaratish

**Role:** `kitchen_admin`, `company_admin`, `super_admin`

```json
{
  "title": "Tushlik",
  "description": "12:30–13:00",
  "sort_order": 0
}
```

---

## PATCH `/menu/{menu_id}` — Yangilash

```json
{ "title": "Yangi nom", "active": false }
```

---

## DELETE `/menu/{menu_id}` — O'chirish

`active = false` qilinadi (soft). **Role:** `super_admin`, `company_admin`

---

## POST `/menu/{menu_id}/items` — Taom qo'shish

**Role:** `kitchen_admin`, `company_admin`, `super_admin`

```json
{
  "name": "Osh",
  "description": "Toshkent oshi, 350g",
  "price": 30000,
  "image_url": "https://...",
  "available": true,
  "available_days": [1, 2, 3, 4, 5],
  "category_id": "uuid",
  "is_halal": true,
  "is_spicy": false,
  "weight_grams": 350,
  "calories": 520
}
```

`available_days` — ISO hafta kunlari (1=Du … 7=Yak). Maydon **berilmasa yoki `null`** → server uni barcha kunlar `[1,2,3,4,5,6,7]` qilib o'rnatadi (xavfsiz default). **Bo'sh ro'yxat `[]`** = ataylab hech qaysi kunda ko'rinmasligi.

---

## PATCH `/kitchens/{id}/items/{item_id}` — Taom yangilash

```json
{
  "available": false,
  "price": 35000,
  "available_days": [1, 2, 3, 4, 5]
}
```

---

## DELETE `/kitchens/{id}/items/{item_id}` — Soft delete

`deleted_at` o'rnatiladi. **Status:** 204

---

## Tags

```
GET    /kitchens/{id}/items/{item_id}/tags
POST   /kitchens/{id}/items/{item_id}/tags   { "name": "Spicy" }
DELETE /kitchens/{id}/items/{item_id}/tags/{tag_id}
GET    /kitchens/{id}/tags
```
