# 📄 LUNCH DROP - B2B KATERING TIZIMI: BACKEND TEXNIK VAZIFA (TZ)

**Versiya:** 4.0.0 (Mukammal / Production-ready)
**Tizim Turi:** RESTful API
**Tavsiya etilgan texnologiyalar:** Node.js (NestJS / Express) yoki Python (FastAPI / Django), PostgreSQL, Redis, AWS S3 (yoki lokal fayl tizimi).
**Vaqt mintaqasi (Timezone):** Barcha vaqt va sana amallari qat'iy ravishda `Asia/Tashkent` (UTC+5) bo'yicha hisoblanadi.

---

## 1. MA'LUMOTLAR BAZASI (DB) SXEMASI VA RELATSIYALAR

Ma'lumotlar yaxlitligini saqlash uchun asosiy jadvallarda **Soft Delete** (`deleted_at`) ishlatiladi, bu eski moliyaviy hisobotlarning buzilib ketmasligini ta'inlaydi.

### 1.1. `users` (Foydalanuvchilar va Xodimlar)
- `id` (UUID, PK)
- `phone` (String, Unique, Index)
- `password_hash` (String, Nullable) - Faqat adminlar uchun.
- `role` (Enum: `SUPER_ADMIN`, `KITCHEN_ADMIN`, `COMPANY_ADMIN`, `EMPLOYEE`)
- `company_id` (UUID, FK, Nullable) - Faqat Company Admin va Employee uchun.
- `branch_id` (UUID, FK, Nullable) - Faqat Employee uchun.
- `kitchen_id` (UUID, FK, Nullable) - **Faqat Kitchen Admin uchun (Data Isolation).**
- `company_status` (Enum: `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `INACTIVE`, Nullable) - `INACTIVE` ishdan bo'shaganlar uchun.
- `is_active` (Boolean, Default: true)
- `created_at`, `updated_at`, `deleted_at` (Timestamps)

### 1.2. `companies` & `branches`
- **`companies`**: `id` (UUID), `name` (String), `logo_url` (String, Nullable), `billing_day` (Int: 1-28), `deleted_at`.
- **`branches`**: `id` (UUID), `company_id` (FK), `name` (String), `address` (Text), `lat` (Float), `lng` (Float), `deleted_at`.

### 1.3. `kitchens` & `branch_kitchens`
- **`kitchens`**: `id` (UUID), `name` (String), `phone` (String), `order_cutoff_time` (Time, masalan: `10:30:00`), `delivery_start_time` (Time), `delivery_end_time` (Time), `is_active` (Boolean), `deleted_at`.
- **`branch_kitchens` (Pivot)**: `branch_id` (FK), `kitchen_id` (FK). (Many-to-Many).

### 1.4. Menu (Menyu tizimi)
- **`menu_categories`**: `id` (UUID), `kitchen_id` (FK), `name` (String).
- **`meals`**: `id` (UUID), `kitchen_id` (FK), `category_id` (FK), `name` (String), `description` (Text), `price` (Decimal, 10,2), `image_url` (String), `deleted_at`.
- **`menu_schedules`**: `id` (UUID), `kitchen_id` (FK), `meal_id` (FK), `day_of_week` (Int: 1-7, Nullable), `specific_date` (Date, Nullable) - **Bayramlar yoki maxsus sanalar uchun dinamik menyu.**

### 1.5. `orders` (Buyurtmalar)
- `id` (UUID, PK)
- `employee_id` (FK)
- `kitchen_id` (FK)
- `meal_id` (FK)
- `target_date` (Date, Index) - Qaysi kunga tegishli ekanligi.
- `historical_price` (Decimal, 10,2) - Buyurtma berilgan vaqtdagi asl narx.
- `status` (Enum: `CREATED`, `PREPARING`, `ON_THE_WAY`, `DELIVERED`, `CANCELLED`)
- `system_fee` (Decimal, 10,2, Default: 0)
- `created_at`, `updated_at` (Timestamps)
- **Index:** `UNIQUE(employee_id, target_date)` (Bir xodim 1 kunda faqat 1 ta tushlik buyurtma qila oladi).

### 1.6. `invoices` (Moliyaviy Hisob-fakturalar)
- `id` (UUID, PK)
- `company_id` (FK)
- `period_start` (Date), `period_end` (Date)
- `total_company_expense` (Decimal, 10,2) - Kompaniya to'lashi kerak bo'lgan jami summa.
- `total_system_fee` (Decimal, 10,2) - Tizimning 3% foydasi.
- `total_kitchen_profit` (Decimal, 10,2) - Oshxona foydasi (97%).
- `status` (Enum: `PENDING`, `PAID`)
- `created_at`, `updated_at`

---

## 2. BIZNES MANTIQLARI VA AVTOMATIZATSIYA

### 2.1. Autentifikatsiya va Onboarding
1. `employee-login`: Telefon raqam -> SMS OTP (Redis `ttl: 3 min`). Limit: 1 IP/Raqam uchun 1 daqiqada 1 ta, kuniga 5 ta.
2. `employee-verify`: OTP tekshiriladi -> **Access Token (15 min) va Refresh Token (7 kun)** beriladi.
3. `join-company`: Xodim filiallarni tanlab so'rov yuboradi (`company_status = PENDING_APPROVAL`).
4. `approve-employee`: Company Admin so'rovni tasdiqlaydi. Xodim ishdan ketsa, status `INACTIVE` qilinadi va tizimga kirish huquqi cheklanadi.

### 2.2. Menyu va Buyurtma Validatsiyasi (Vaqt qat'iy tekshiriladi)
Frontend yuborgan `target_date` tekshiruvi (`Asia/Tashkent` bo'yicha):
* `target_date < today` ➡️ **403 Forbidden** (O'tgan sana).
* `target_date == today`: 
  * Hozirgi soat `< order_cutoff_time` ➡️ Ruxsat etiladi (`CREATED`).
  * Hozirgi soat `>= order_cutoff_time` ➡️ **403 Forbidden** (Buyurtma qabul qilish vaqti tugagan).
* `target_date > today` ➡️ Ruxsat (Oldindan buyurtma).

> **Muhim mantiq:** `menu_schedules` tekshirilayotganda birinchi navbatda `specific_date` (maxsus sana) qidiriladi. Agar u bo'lmasa, `day_of_week` bo'yicha odatiy haftalik menyu ko'rsatiladi.

### 2.3. Buyurtma Holatlari (Cron-Job va Tasdiqlash)
**A. Cron-Job (Avtomatlashtirish):**
Backend'da har 1 daqiqada ishlovchi skript (`node-cron` / `Celery`):
1. `CREATED` ➡️ `PREPARING`: Vaqt `order_cutoff_time` ga yetsa.
2. `PREPARING` ➡️ `ON_THE_WAY`: Vaqt `delivery_start_time` ga yetsa.

**B. Yetkazib berishni tasdiqlash (`DELIVERED`):**
Avtomatik *qilinmaydi* (noto'g'ri hisob-kitobning oldini olish uchun). Buyurtmani 3 xil usulda `DELIVERED` qilish mumkin:
1. Xodim o'z mobil ilovasidan "Qabul qildim" tugmasini bosadi.
2. Company Admin barcha bugungi buyurtmalarni ommaviy tasdiqlaydi (Bulk approve).
3. Kitchen Admin panelidan qo'lda tasdiqlaydi.
*(Status `DELIVERED` bo'lgandagina `system_fee` hisoblanadi: `historical_price * 0.03`).*

---

## 3. MOLIYA VA HISOB-KITOB MANTIG'I (Invoicing)

Cron-job har kuni soat 23:59 da ishlaydi va `companies` jadvalidagi `billing_day` (hisob-kitob kuni) bugungi sanaga teng bo'lgan kompaniyalarni qidiradi.
Topilgan kompaniyalar uchun:
1. O'tgan 1 oy ichidagi barcha `DELIVERED` statusli buyurtmalar yig'iladi.
2. `invoices` jadvaliga yangi yozuv yaratiladi (Status: `PENDING`).
3. Ushbu hisob-faktura shakllangandan so'ng, tizim qotirilgan `total_amount` ga qarab kompaniyalarga shot (faktura) taqdim etadi. Bu eski o'zgarishlardan himoyani ta'minlaydi.

---

## 4. API ENDPOINTS

### 4.1. Auth & Public (Rate Limiter bilan himoyalangan)
* `POST /api/auth/admin-login` (Phone, Password)
* `POST /api/auth/employee-send-otp` (Phone)
* `POST /api/auth/employee-verify-otp` (Phone, OTP)
* `POST /api/auth/refresh-token` (Refresh token orqali yangi JWT olish)

### 4.2. Super Admin API (`SUPER_ADMIN`)
* `GET /api/super-admin/dashboard` (Statistikalar)
* `CRUD /api/super-admin/companies` & `CRUD /api/super-admin/kitchens` (Boshqaruv)
* `POST /api/super-admin/branches/{id}/assign-kitchens` (Oshxonani filialga biriktirish)
* `GET /api/super-admin/invoices` (Tizimning jami moliyaviy aylanmasi)

### 4.3. Kitchen Admin API (`KITCHEN_ADMIN`)
* `GET /api/kitchen/dashboard` 
* `CRUD /api/kitchen/meals` (Taomlar `deleted_at` qilinadi, bazadan uchib ketmaydi)
* `POST /api/kitchen/schedule-menu` (Haftalik yoki maxsus sanaga menyu qo'yish)
* `PATCH /api/kitchen/orders/status` (Buyurtmalar holatini majburan o'zgartirish, `ON_THE_WAY` ➡️ `DELIVERED`)

### 4.4. Company Admin API (`COMPANY_ADMIN`)
* `GET /api/company/dashboard`
* `GET /api/company/employees/pending` (Yangi so'rovlar)
* `PATCH /api/company/employees/{id}/status` (`APPROVED`, `REJECTED` yoki ishdan bo'shasa `INACTIVE` qilish)
* `PATCH /api/company/orders/bulk-confirm` (Filialga kelgan taomlarni ommaviy `DELIVERED` deb tasdiqlash)
* `GET /api/company/invoices` (Kompaniyaning oylik to'lov kvitansiyalari)

### 4.5. Employee API (`EMPLOYEE`)
* `POST /api/employee/join-branch`
* `GET /api/employee/menu` (Tanlangan sana bo'yicha menyuni qaytarish)
* `POST /api/orders`
* `PATCH /api/orders/{id}/confirm-delivery` (O'zining buyurtmasini qabul qilib olganini tasdiqlash)
* `POST /api/orders/{id}/cancel` (Faqat `CREATED` bo'lsa va vaqt tugamagan bo'lsa)

---

## 5. XAVFSIZLIK VA TEXNIK TALABLAR (CRITICAL)

1. **Race Condition Himoyasi:** Buyurtma berishda tranzaksiyalar (DB Transaction) qo'llanilishi va bazada `UNIQUE(employee_id, target_date)` indeksi bo'lishi shart. Agar kompaniya kuniga 2 mahal ovqat bersa, unda API ichida qat'iy hisob-kitob (lock) ishlashi kerak.
2. **Data Isolation (Tenant Security):** `KITCHEN_ADMIN` va `COMPANY_ADMIN`ning barcha ma'lumot olish API'lari Middleware darajasida ularning Tokenidagi `kitchen_id` yoki `company_id` asosida filtrlanishi **shart**. Ularga ID yuborish imkoniyati berilmasligi kerak (masalan, kimgadir tegishli taomni o'zgartira olmasligi uchun).
3. **CORS va Brute-Force:** Admin panellari faqat ruxsat etilgan domenlardan ishlashi kerak (Masalan: `admin.lunchdrop.uz`). Admin loginda 5 marta ketma-ket xato parol kiritilsa, hisob 15 daqiqaga bloklanadi.
4. **Fayllar Storage:** Rasmlar to'g'ridan-to'g'ri DB ga emas, AWS S3 yoki alohida media serverga yuklanadi va DB ga faqat URL saqlanadi. O'chirilganda Storage'dan ham tozalanadigan Job yozilishi tavsiya etiladi.