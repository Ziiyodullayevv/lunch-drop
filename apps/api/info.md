# LunchDrop — Loyiha Hujjati (info.md)

Tushlik buyurtma qilish B2B platformasi backend API. Korxonalar xodimlari oshxonalardan
tushlik buyurtma qiladi; tizim 3% komissiya oladi, oxirida korxonaga oylik hisob-faktura yaratiladi.

> **Stack:** Python 3.13 · FastAPI · SQLAlchemy 2.0 (async) · PostgreSQL 16 · Alembic · APScheduler (cron) · JWT (RS256) · argon2 (parol hash)
> **Arxitektura:** `api/v1` (router) → `services` (biznes logika) → `repositories`/`models` (DB). Hamma config `.env` dan.
> **Jonli:** `http://164.90.210.222:8000` — Swagger `/docs`, prefiks `/api/v1`.

---

## 1. Rollar va umumiy oqim

| Rol | Kim | Login usuli |
|-----|-----|-------------|
| `super_admin` | Platforma egasi | telefon + parol |
| `kitchen_admin` | Oshxona boshqaruvchisi | telefon + parol (super_admin tasdig'idan keyin) |
| `company_admin` | Korxona boshqaruvchisi | telefon + parol (super_admin tasdig'idan keyin) |
| `employee` | Korxona xodimi | telefon + OTP (parolsiz) |

**Admin ro'yxatdan o'tish oqimi:**
`send-otp` → `verify-otp` (vaqtinchalik token) → `admin-register` (muassasa + admin yaratiladi, `PENDING_APPROVAL`) → super_admin `approve` → `admin-login`.

**Xodim oqimi (ko'p-filialli):**
`send-otp` → `employee-login` (avto-yaratiladi) → `companies?search=` (kompaniya tanlash) → `join-branch` (bir nechta **filialga** so'rov, `PENDING_APPROVAL`) → company_admin `approve` → buyurtma berish mumkin.

---

## 2. Ma'lumotlar bazasi modellari

Hamma jadvalda `id` (UUID), `created_at`, `updated_at` bor (`TimestampMixin`).
`SoftDeleteMixin` borlari `deleted_at` bilan yumshoq o'chiriladi (jismonan o'chmaydi).

### Asosiy jadvallar

| Model | Jadval | Vazifa | Soft-delete |
|-------|--------|--------|:-----------:|
| `User` | `users` | Barcha foydalanuvchilar (4 rol) | ✅ |
| `Company` | `companies` | Korxona/mijoz | ✅ |
| `Branch` | `branches` | Korxona filiali (manzil + lat/lng) | ✅ |
| `EmployeeBranch` | `employee_branches` | **Xodim ↔ Filial (M:N)** — xodim bir nechta filialda | — |
| `Kitchen` | `kitchens` | Oshxona (vaqtlar + lat/lng) | ✅ |
| `BranchKitchen` | `branch_kitchens` | Filial ↔ Oshxona (M:N pivot) | — |
| `MenuCategory` | `menu_categories` | Menyu kategoriyasi (oshxona ichida) | — |
| `Meal` | `meals` | Taom (narx, rasm) | ✅ |
| `MenuSchedule` | `menu_schedules` | Taom qaysi kun/sanada mavjud | — |
| `Order` | `orders` | Buyurtma (xodim/filial/oshxona/taom) | — |
| `Invoice` | `invoices` | Oylik hisob-faktura | — |
| `OtpCode` | `otp_codes` | OTP kodi (hash qilingan) | — |
| `RefreshToken` | `refresh_tokens` | Refresh token (logout/rotation) | — |

### Muhim ustunlar

**User** — `phone` (unik), `password_hash` (admin uchun; employee'da null), `role`, `is_active`,
`account_status` (tasdiqlash holati), `company_id` / `kitchen_id` (rolga qarab bog'lanish),
`failed_login_attempts` + `locked_until` (brute-force himoyasi).
> ⚠️ `branch_id` ustuni **YO'Q** — xodim filialga `employee_branches` (M:N) orqali bog'lanadi.

**Kitchen** — `order_cutoff_time` (qabul tugash vaqti), `delivery_start_time`, `delivery_end_time`
(yetkazish oralig'i), `lat`/`lng` (majburiy), `is_active`. Kitchen admin bularni `/kitchen/settings` orqali boshqaradi.

**Order** — `employee_id`, `branch_id` (buyurtma vaqtida tanlangan filial — ovqat shu yerga yetkaziladi),
`kitchen_id`, `meal_id`, `target_date`, `historical_price` (buyurtma vaqtidagi narx),
`system_fee` (DELIVERED bo'lganda `price * 0.03`), `status`.
> ⚠️ Bir kunda **bir nechta** buyurtma mumkin (`uq_employee_date` cheklovi olib tashlangan).

**Company** — `billing_day` (1–28; oylik hisob-faktura kuni), `logo_url`, `description`.

---

## 3. Modellar bir-biriga qanday bog'langan

```
                         ┌──────────────┐
                         │   Company    │
                         └──────┬───────┘
        1:N ┌─────────────┬─────┴───────┬──────────────┐ 1:N
            ▼             ▼             ▼               ▼
      ┌──────────┐  ┌──────────┐  ┌──────────┐   (company_admin = User.company_id)
      │  Branch  │  │ Invoice  │  │   User   │
      └────┬─────┘  └──────────┘  │(employee)│
           │                       └────┬─────┘
   ┌───────┴───────┐                    │
   │ M:N           │ M:N                │ M:N (employee_branches)
   │(BranchKitchen)│                    │
   ▼               ▼────────────────────┘  xodim ↔ filial(lar)
┌──────────┐  ┌──────────┐
│ Kitchen  │  │  Order   │◄── employee_id, branch_id, kitchen_id, meal_id
└────┬─────┘  └──────────┘
 1:N │
     ├──────────┬──────────────┐
     ▼          ▼              ▼
┌─────────┐ ┌──────┐ ┌──────────────┐
│MenuCateg│ │ Meal │ │ MenuSchedule │
└─────────┘ └──────┘ └──────────────┘
```

**Bog'lanishlar ro'yxati (Foreign Key):**

| Dan | Ga | Tur | Izoh |
|-----|-----|-----|------|
| `Branch.company_id` | `Company` | N:1 | Filial qaysi korxonaniki |
| `User.company_id` | `Company` | N:1 | company_admin / employee |
| `User.kitchen_id` | `Kitchen` | N:1 | faqat kitchen_admin (data isolation) |
| `EmployeeBranch.user_id` / `branch_id` | `User` / `Branch` | N:1 | **xodim ↔ filial M:N** (bir xodim ko'p filial) |
| `BranchKitchen.branch_id` / `kitchen_id` | `Branch` / `Kitchen` | N:1 | filial ↔ oshxona M:N |
| `MenuCategory.kitchen_id` | `Kitchen` | N:1 | kategoriya oshxonaga tegishli |
| `Meal.kitchen_id` / `category_id` | `Kitchen` / `MenuCategory` | N:1 | taom oshxonaga tegishli |
| `MenuSchedule.kitchen_id` / `meal_id` | `Kitchen` / `Meal` | N:1 | taom qachon menyuda |
| `Order.employee_id` | `User` | N:1 | buyurtmachi xodim |
| `Order.branch_id` | `Branch` | N:1 | yetkazish filiali (buyurtmada tanlanadi) |
| `Order.kitchen_id` / `meal_id` | `Kitchen` / `Meal` | N:1 | qaysi oshxona / taom |
| `Invoice.company_id` | `Company` | N:1 | korxonaning hisob-fakturasi |
| `RefreshToken.user_id` | `User` | N:1 | token egasi |

**Mantiqiy zanjir:** Korxona → Filial → (M:N) → Oshxona → Taom → Menyu jadvali.
Xodim bir nechta filialga a'zo bo'ladi → buyurtmada filialni tanlaydi → o'sha filialga ulangan oshxonalardan buyurtma qiladi.

---

## 4. API endpointlari (rol bo'yicha)

Prefiks: `/api/v1`. Xato formati: `{ "detail": "..." }`. Ro'yxatlar `limit`/`offset` bilan.

### 4.1. Auth (`/auth`) — ochiq
| Metod | Path | Tavsif |
|-------|------|--------|
| POST | `/auth/send-otp` | Telefonga OTP yuborish (Telegram bot orqali) |
| POST | `/auth/verify-otp` | OTP tasdiqlash → vaqtinchalik token |
| POST | `/auth/admin-register` | Kitchen/Company admin + muassasa yaratish |
| POST | `/auth/admin-login` | Admin login (telefon+parol, faqat APPROVED) |
| POST | `/auth/employee-login` | Xodim login (telefon+OTP, avto-yaratish) |
| POST | `/auth/refresh-token` | Access token yangilash |
| POST | `/auth/logout` | Chiqish |
| GET | `/auth/me` | Joriy foydalanuvchi |

### 4.2. Super Admin (`/super-admin`) — `super_admin`
| Metod | Path | Tavsif |
|-------|------|--------|
| GET | `/super-admin/dashboard` | Umumiy statistika |
| GET/POST · GET/PATCH/DELETE | `/super-admin/companies[/{id}]` | Kompaniyalar CRUD |
| GET/POST · GET/PATCH/DELETE | `/super-admin/kitchens[/{id}]` | Oshxonalar CRUD |
| GET/POST · GET/PATCH/DELETE | `/super-admin/branches[/{id}]` | Filiallar CRUD |
| POST | `/super-admin/branches/{id}/assign-kitchens` | Filialga oshxona biriktirish |
| GET | `/super-admin/users` | Barcha foydalanuvchilar (rol/status/qidiruv) |
| GET/PATCH/DELETE | `/super-admin/users/{id}` | Foydalanuvchi ko'rish / tahrirlash (rol+status) / o'chirish |
| GET | `/super-admin/pending-admins` | Tasdiq kutayotgan adminlar |
| PATCH | `/super-admin/admins/{id}/approve` · `/reject` | Tasdiqlash / rad etish |

> Himoya: `super_admin` hisobi tahrirlanmaydi/o'chirilmaydi.

### 4.3. Kitchen Admin (`/kitchen`) — `kitchen_admin` (faqat o'z oshxonasi)
| Metod | Path | Tavsif |
|-------|------|--------|
| GET | `/kitchen/dashboard` | Oshxona statistikasi |
| GET | `/kitchen/me` | O'z oshxona ma'lumotlari |
| PATCH | `/kitchen/settings` | **Qabul/yetkazish vaqtlari**, nom, telefon, holat |
| GET/POST | `/kitchen/categories` | Kategoriyalar |
| GET/POST · GET/PATCH/DELETE | `/kitchen/meals[/{id}]` | Taomlar CRUD |
| POST | `/kitchen/meals/{id}/image` | Taom rasmini yuklash (S3) |
| POST | `/kitchen/schedule-menu` · GET `/schedules` · DELETE `/schedules/{id}` | Menyu jadvali |
| GET | `/kitchen/orders` | Buyurtmalar (boyitilgan: xodim/filial/kompaniya/taom nomi) |
| PATCH | `/kitchen/orders/{id}/status` | Buyurtma holatini o'zgartirish |

### 4.4. Company Admin (`/company`) — `company_admin` (faqat o'z korxonasi)
| Metod | Path | Tavsif |
|-------|------|--------|
| GET | `/company/dashboard` | Korxona statistikasi |
| GET/PATCH | `/company/me` | Korxona profili (nom, logo, billing_day) |
| GET/POST · GET/PATCH/DELETE | `/company/branches[/{id}]` | Filiallar CRUD |
| GET | `/company/kitchens` | Biriktirish mumkin bo'lgan oshxonalar |
| GET | `/company/branches/{id}/kitchens` | Filialga biriktirilgan oshxonalar |
| POST | `/company/branches/{id}/assign-kitchens` | Filialga oshxona biriktirish |
| GET | `/company/employees` | Barcha xodimlar (status filtri) |
| GET | `/company/employees/pending` | Tasdiq kutayotgan xodimlar (filial nomlari bilan) |
| PATCH | `/company/employees/{id}/status` | Xodim holati (APPROVED/REJECTED/INACTIVE) |
| GET | `/company/orders` | Korxona buyurtmalari (boyitilgan, sana/status filtri) |
| PATCH | `/company/orders/bulk-confirm` | Bugungilarni ommaviy DELIVERED qilish |
| GET | `/company/invoices` | Hisob-fakturalar |

### 4.5. Employee (`/employee`, `/orders`) — `employee`
| Metod | Path | Tavsif |
|-------|------|--------|
| GET | `/employee/companies?search=` | Kompaniyalar va filiallar (nom bo'yicha qidiruv) |
| POST | `/employee/join-branch` | Bir nechta filialga qo'shilish so'rovi (`branch_ids`) |
| GET | `/employee/status` | O'z tasdiq holati va filiallari |
| GET/PATCH | `/employee/me` | O'z profili / ism yangilash |
| GET | `/employee/menu?target_date=&branch_id=` | Menyu (sana + ixtiyoriy filial) |
| POST | `/orders` | Buyurtma berish (`branch_id` majburiy — qaysi filial) |
| GET | `/orders?month=YYYY-MM` yoki `?target_date=` | Buyurtmalar tarixi (oylik/kunlik) |
| GET | `/orders/{id}` | Buyurtma tafsilotlari (status_label bilan) |
| PATCH | `/orders/{id}/confirm-delivery` | Yetkazishni tasdiqlash |
| POST | `/orders/{id}/cancel` | Buyurtmani bekor qilish |

### Health
`GET /api/v1/health` · `GET /health/db`

---

## 5. Enumlar (holatlar)

- **UserRole:** `super_admin` · `kitchen_admin` · `company_admin` · `employee`
- **AccountStatus:** `pending_approval` → `approved` / `rejected` / `inactive`
- **OrderStatus:** `created` → `preparing` → `on_the_way` → `delivered` (↘ `cancelled`)
  - O'zbekcha yorliqlar (`ORDER_STATUS_LABELS`, xodimga ko'rinadi): Qabul qilindi → Tayyorlanmoqda → Yo'lda → Yetkazildi (· Bekor qilindi)
- **InvoiceStatus:** `pending` → `paid`

---

## 6. Avtomatik jarayonlar (cron — APScheduler)

Alohida jarayon (`python -m app.workers.scheduler`):

1. **Har 1 daqiqada — status o'tishlari:**
   - `created → preparing` — oshxona `order_cutoff_time` yetganda
   - `preparing → on_the_way` — `delivery_start_time` yetganda
2. **Har kuni 23:59 — hisob-faktura:** `billing_day` mos korxonalar uchun 30 kunlik `delivered` buyurtmalar yig'iladi (100% korxona / 3% tizim / 97% oshxona; idempotent).

---

## 7. Xavfsizlik

- Parollar **argon2** (`pwdlib`); JWT **RS256** (keys/private.pem, public.pem).
- **Data isolation:** kitchen_admin/company_admin faqat token'dagi `kitchen_id`/`company_id` doirasida; employee faqat o'z a'zo filiallari.
- **Brute-force:** 5 ta xato login → 15 daqiqa blok. **OTP:** kunlik limit 5 + 60s cooldown; kod hash qilinadi.
- Kiruvchi ma'lumot Pydantic bilan validatsiya; xatolarda ichki tafsilot oshkor qilinmaydi.
- OTP yetkazish: hozircha **Telegram bot** (test); ishlab chiqarishda Eskiz.uz SMS.

---

## 8. Joriy holat

✅ **Tayyor va serverda jonli:** to'liq auth, super-admin (companies/kitchens/branches/**users** CRUD + tasdiqlash),
kitchen-admin (menyu/taom/jadval/buyurtma/**vaqt sozlamalari**), company-admin (filial CRUD/**oshxona biriktirish**/xodim/buyurtma/faktura),
employee (qidiruv/**ko'p-filialli a'zolik**/menyu/**filialli buyurtma**/tarix/profil), boyitilgan `OrderRead`
(xodim/filial/kompaniya/oshxona/taom nomlari), cron (status + invoicing), data isolation, brute-force/OTP himoyasi.

⏳ **Hali yo'q:** Eskiz.uz SMS integratsiyasi, S3 kalitlari (modul tayyor), pytest avtomatik testlar, HTTPS/domen.
