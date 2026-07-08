# Domain Entities

## Asosiy tuzilma

```
Company
  └── Branch (filial)
        └── KitchenBranchMapping ──► Kitchen (oshxona)
                                          └── Menu (menyu bo'limi)
                                                └── FoodItem (taom)

User (xodim) ──► Branch
             └── Order ──► OrderItem ──► FoodItem
                      └── GroupedOrder (branch + kitchen)
```

---

## Company

Kompaniya. Bir kompaniyaning bir yoki bir nechta filiali bo'ladi.

| Maydon | Turi | Tavsif |
|--------|------|--------|
| `id` | UUID string | PK |
| `name` | string | Kompaniya nomi |
| `status` | enum | `pending` / `active` / `suspended` (o'chirish — `deleted_at` orqali, status emas) |
| `logo_url` | string? | Logo |
| `contact_phone` | string? | Aloqa |

---

## Branch

Filial. Xodimlar ma'lum bir filialga biriktiriladi.

| Maydon | Turi | Tavsif |
|--------|------|--------|
| `id` | UUID string | PK |
| `company_id` | FK | Kompaniya |
| `name` | string | Filial nomi |
| `address` | string | Manzil |
| `status` | enum | `active` / `inactive` |
| `payment_day` | int? | Oylik to'lov kuni (1–31) |

---

## Kitchen

Oshxona. Bir filialga bir nechta oshxona ulanishi mumkin (`KitchenBranchMapping` orqali).

| Maydon | Turi | Tavsif |
|--------|------|--------|
| `id` | UUID string | PK |
| `name` | string | Oshxona nomi |
| `status` | enum | `pending` / `approved` / `suspended` |
| `cutoff_time` | time | Buyurtma qabul qilish tugash vaqti (masalan 10:30) |
| `delivery_start_time` | time | Yetkazib berish boshlanishi (masalan 12:30) |
| `delivery_end_time` | time | Yetkazib berish tugashi (masalan 13:00) |
| `rating` | float | O'rtacha reyting |
| `is_halal` | bool | Halol taomlar |
| `is_diet_friendly` | bool | Dietali |
| `budget_range` | enum? | `budget` / `standard` / `premium` |

---

## KitchenBranchMapping

Oshxona ↔ Filial bog'liq. Bir oshxona bir nechta filialga ulanishi mumkin.

| Maydon | Turi | Tavsif |
|--------|------|--------|
| `kitchen_id` | FK | Oshxona |
| `branch_id` | FK | Filial |
| `active` | bool | Faol ulanish |

---

## Menu

Oshxona ichidagi menyu bo'limi (masalan "Tushlik", "Dessertlar").

| Maydon | Turi | Tavsif |
|--------|------|--------|
| `id` | UUID string | PK |
| `kitchen_id` | FK | Oshxona |
| `title` | string | Bo'lim nomi |
| `sort_order` | int | Tartib |
| `active` | bool | Ko'rinadimi |

---

## FoodItem

Taom. Menyuga kiradi, kategoriyaga birikishi mumkin.

| Maydon | Turi | Tavsif |
|--------|------|--------|
| `id` | UUID string | PK |
| `menu_id` | FK | Menyu bo'limi |
| `category_id` | FK? | Kategoriya |
| `name` | string | Nomi |
| `price` | decimal | Narxi (so'm) |
| `image_url` | string? | Rasm |
| `available` | bool | Bugun mavjudmi |
| `available_days` | JSON list | ISO hafta kunlari: `[1,2,3,4,5]` (1=Du, 7=Yak). Yaratishda ko'rsatilmasa → barcha kunlar `[1..7]`. Bo'sh `[]` = ataylab hech qaysi kunda ko'rinmaydi |
| `is_halal` | bool | Halol |
| `is_spicy` | bool | Achchiq |
| `is_vegetarian` | bool | Vegetarian |
| `weight_grams` | int? | Grammaj |
| `calories` | int? | Kaloriya |
| `deleted_at` | datetime? | Soft delete |

---

## User

Foydalanuvchi. Rol va biriktirilgan entity'ga qarab kirish huquqlari farqlanadi.

| Maydon | Turi | Tavsif |
|--------|------|--------|
| `id` | UUID string | PK |
| `phone` | string? | Telefon (unique). Mobile (OTP) login uchun |
| `email` | string? | Email (unique). Admin (parol) login uchun |
| `password_hash` | string? | Bcrypt/argon2 hash. Faqat parolli rollar (admin) uchun. Mobile xodimda `null` |
| `name` | string? | Ism |
| `role` | enum | `super_admin` / `company_admin` / `kitchen_admin` / `employee` |
| `company_id` | FK? | `company_admin` uchun |
| `branch_id` | FK? | `employee` uchun |
| `kitchen_id` | FK? | `kitchen_admin` uchun |
| `status` | enum | `pending` / `active` / `blocked` |
| `telegram_id` | bigint? | Telegram bot uchun |
| `push_token` | string? | Push notification uchun |

---

## Order

Individual buyurtma — bir xodimdan bir oshxonaga.

| Maydon | Turi | Tavsif |
|--------|------|--------|
| `id` | UUID string | PK |
| `user_id` | FK | Xodim |
| `branch_id` | FK | Filial |
| `kitchen_id` | FK | Oshxona |
| `grouped_order_id` | FK? | Guruhli buyurtma (guruhlanganidan keyin) |
| `total_price` | decimal | Jami summa |
| `status` | enum | Quyida |
| `note` | string? | Izoh |

**Status zanjiri:**
```
pending → grouped → cooking → ready → delivered
                                    ↘ cancelled
```

---

## GroupedOrder

Bir filial + bir oshxona bo'yicha barcha buyurtmalar guruhlanadi.

| Maydon | Turi | Tavsif |
|--------|------|--------|
| `id` | UUID string | PK |
| `branch_id` | FK | Filial |
| `kitchen_id` | FK | Oshxona |
| `total_orders` | int | Nechta buyurtma |
| `total_items` | int | Nechta taom |
| `total_amount` | decimal | Jami summa |
| `status` | enum | `sent` / `cooking` / `ready` / `delivered` / `cancelled` |
| `delivery_time` | datetime | Yetkazish vaqti |

---

## OrderItem

Buyurtma tarkibi — qaysi taom, nechta, qancha narxda.

| Maydon | Turi | Tavsif |
|--------|------|--------|
| `order_id` | FK | Buyurtma |
| `food_item_id` | FK | Taom |
| `quantity` | int | Soni |
| `price` | decimal | Narxi (buyurtma vaqtidagi) |
