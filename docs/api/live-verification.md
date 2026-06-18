# Live API Verification

Muhit: `http://164.90.210.222:8000/api/v1`

Asosiy tekshiruv sanasi: `2026-06-11`
Dashboard qayta tekshiruvi: `2026-06-13`

Ishlatilgan akkauntlar:

| Telefon | Rol | Holat |
|---|---|---|
| `+99899***0001` | `kitchen_admin` | `approved`, faol |
| `+99899***0002` | `company_admin` | `approved`, faol |

Parollar, access tokenlar va refresh tokenlar repositoryga yozilmadi.

## Natija

| Holat | Soni |
|---|---:|
| Muvaffaqiyatli assertion | 82 |
| Xato | 0 |
| Ataylab o'tkazib yuborilgan | 1 |

`PATCH /company/orders/bulk-confirm` bajarilmadi. Tekshiruv vaqtida 3 ta real
`on_the_way` order bor edi va endpoint ularni qaytarib bo'lmas tarzda
`delivered` holatiga o'tkazardi.

## Health va OpenAPI

| Endpoint | Status | Natija |
|---|---|---|
| `GET /api/v1/health` | `200` | Ilova ishlayapti |
| `GET /api/v1/health/db` | `200` | Database ishlayapti |
| `GET /api/v1/openapi.json` | `200` | OpenAPI `3.1.0`, API `0.1.0` |

Health endpointlari `/health` emas, `/api/v1/health` prefiksi bilan ishlaydi.

## 2026-06-14 Backend Qayta Tekshiruvi

Tuzatilgan qismlar:

- `/api/v1/health` va `/api/v1/health/db` `200` qaytardi.
- Dashboard uchala role uchun `DashboardResponse` modeliga ulangan.
- `SummaryCard.key` eski UI uchun kerakli biznes keylarni o'z ichiga oladi.
- History va monthly massiv uzunliklari OpenAPI schema'da cheklangan.
- Company va kitchen dashboard live response'lari yangi schema assertionlaridan
  o'tdi.
- Role chegaralari ishlaydi: kitchen token company dashboardga, company token
  kitchen dashboardga `403` qaytaradi.
- Noto'g'ri `year` qiymati `422` qaytaradi.

Hali qolgan backend cheklovlari:

- `/kitchen/categories` faqat `GET` va `POST`; category update/delete endpointi
  yo'q.
- `/uploads/image` uchun delete endpointi yo'q.
- `KitchenRead` company yoki branch bog'lanishini qaytarmaydi; super admin
  oshxonalarni kompaniya/filial bo'yicha filtrlay olmaydi.
- `/super-admin/orders`da native matnli `search` query parametri yo'q.

## Dashboard Analytics OpenAPI

2026-06-14 kuni OpenAPI qayta tekshirildi. Quyidagi uch endpointda ixtiyoriy
`year: integer` query parametri mavjud:

- `GET /super-admin/dashboard`
- `GET /company/dashboard`
- `GET /kitchen/dashboard`

Parametr tavsifi: `Oylik chart yili (default: joriy yil)`.

Qayta tekshiruvda uchala endpoint response'i
`#/components/schemas/DashboardResponse` modeliga ulandi. Model `year`,
`timezone`, `generated_at`, `summary`, `order_status_totals` va
`monthly_orders` maydonlarini required qiladi.

2026-06-14 kuni `company_admin` va `kitchen_admin` payloadlari yana live
tekshirildi. `super_admin` response kontrakti OpenAPI orqali tekshirildi:

| Rol | Status | Summary | History | Status totals | Monthly |
|---|---:|---|---|---|---|
| `super_admin` | OpenAPI | Role keylari schema enumida | 8 ta | 5 ta status | 12 + 12 |
| `company_admin` | `200` | 6 ta key | Har birida 8 ta | 5 ta status | 12 + 12 |
| `kitchen_admin` | `200` | 6 ta key | Har birida 8 ta | 5 ta status | 12 + 12 |

Oldingi super admin live tekshiruvi hamda joriy company/kitchen response'larida
`timezone: "Asia/Tashkent"` qaytdi. 2024, 2025 va 2026 yillari uchun
`monthly_orders.year` request yiliga teng va ikkala oylik massiv 12 tadan
bo'ldi.

Credential qiymatlari va tokenlar repositoryga yozilmadi.

### Dashboard bilan moslik

Oldin yetishmagan `revenue_total`, `monthly_cost`, `weekly_revenue`,
`connected_companies`, `lunch_subscribers_today` va boshqa role keylari
backend enumiga qo'shilgan. Frontend yangi kontraktga ulandi; eski
`/stats/area-chart` va `/stats/donut-chart` so'rovlari olib tashlandi.

Batafsil jadval:
[dashboard-contract.md](./dashboard-contract.md#eski-ui-bilan-farqlar).

## Auth

Har ikkala akkaunt uchun quyidagi oqim tekshirildi:

1. `POST /auth/admin-login` -> `200`
2. `GET /auth/me` -> `200`, rol va account holati to'g'ri
3. `POST /auth/refresh-token` -> `200`, yangi token juftligi
4. `POST /auth/logout` -> `204`
5. Logout qilingan refresh tokenni qayta ishlatish -> `401`

## Kitchen Admin

### Read endpointlar

| Endpoint | Status |
|---|---|
| `GET /kitchen/dashboard` | `200` |
| `GET /kitchen/me` | `200` |
| `GET /kitchen/categories` | `200` |
| `GET /kitchen/meals?limit=1&offset=0` | `200` |
| `GET /kitchen/schedules` | `200` |
| `GET /kitchen/orders?target_date=2026-06-11` | `200` |
| `GET /kitchen/orders/{order_id}` | `200` |

Live dashboard:

```json
{
  "meals": 2,
  "orders_today": 3,
  "orders_today_by_status": {
    "on_the_way": 3
  }
}
```

`GET /kitchen/settings` mavjud emas va `405 Method Not Allowed` qaytaradi.
Sozlamalarni o'qish uchun `GET /kitchen/me`, yozish uchun
`PATCH /kitchen/settings` ishlatiladi.

### Write va CRUD

| Amal | Status | Cleanup |
|---|---|---|
| Kitchen settings update | `200` | Eski qiymatlar qayta tiklandi |
| Category create | `201` | Delete endpoint yo'q |
| Meal create | `201` | O'chirildi |
| Meal detail | `200` | — |
| Meal update | `200` | — |
| Meal image upload | `200` | Meal bilan birga o'chirildi |
| Schedule create | `201` | O'chirildi |
| Schedule filter | `200` | — |
| Schedule delete | `204` | Tasdiqlandi |
| Meal delete | `204` | Keyingi GET `404` |
| Order status idempotent PATCH | `200` | Status o'zgarmadi |

Vaqtinchalik category:

```text
LD-SMOKE-20260611T182750Z Category
```

OpenAPI'da category update/delete endpointi bo'lmagani uchun bu yozuv serverda
qoldi. Uni tozalash uchun backendga category delete endpointi qo'shilishi kerak.

`POST /kitchen/meals` ga `price: 0` yuborilganda kutilgan `422` qaytdi.

## Company Admin

### Read endpointlar

| Endpoint | Status |
|---|---|
| `GET /company/dashboard` | `200` |
| `GET /company/me` | `200` |
| `GET /company/branches?limit=1&offset=0` | `200` |
| `GET /company/kitchens?limit=1&offset=0` | `200` |
| `GET /company/employees?account_status=approved` | `200` |
| `GET /company/employees/pending` | `200` |
| `GET /company/orders` combined filterlar bilan | `200` |
| `GET /company/orders/{order_id}` | `200` |
| `GET /company/invoices` | `200` |

Live dashboard:

```json
{
  "employees": 1,
  "pending_employees": 0,
  "orders_today": 3
}
```

### Write va CRUD

| Amal | Status | Cleanup |
|---|---|---|
| Company profile update | `200` | Eski qiymatlar qayta tiklandi |
| Branch create | `201` | O'chirildi |
| Branch detail | `200` | — |
| Branch update | `200` | — |
| Kitchen assign | `200` | Bo'sh ro'yxat bilan unassign qilindi |
| Branch kitchens read | `200` | — |
| Branch delete | `204` | Keyingi GET `404` |
| Employee status idempotent PATCH | `200` | Status o'zgarmadi |

Validatsiya:

| Request | Natija |
|---|---|
| `PATCH /company/me` bilan `billing_day: 29` | `422` |
| Majburiy maydonlarsiz branch create | `422` |

Backend kontrakti bo'yicha `billing_day` oralig'i `1..28`, branch koordinatalari
`lat` va `lng` esa majburiy.

## Upload va Notifications

| Amal | Status |
|---|---|
| PNG bilan `POST /uploads/image` | `200` |
| Har ikki rol uchun notifications list | `200` |
| Bitta notificationni read qilish | `200` |
| Barchasini read qilish | `200` |
| Unread count | `200`, `count: 0` |

Generic upload `.ico` faylni `422` bilan rad etdi, haqiqiy `image/png` faylni
qabul qildi. Upload delete endpointi yo'qligi sababli test PNG media storage'da
qoldi.

## Rol Chegaralari

| Token | Endpoint | Status |
|---|---|---|
| `kitchen_admin` | `/company/me` | `403` |
| `kitchen_admin` | `/super-admin/dashboard` | `403` |
| `company_admin` | `/kitchen/me` | `403` |
| `company_admin` | `/super-admin/dashboard` | `403` |
| `company_admin` | `/employee/status` | `403` |

## Cleanup Holati

| Resurs | Yakuniy holat |
|---|---|
| Kitchen profile | Dastlabki qiymatlar tiklandi |
| Company profile | Dastlabki qiymatlar tiklandi |
| Test meal | O'chirildi, GET `404` |
| Test schedule | O'chirildi |
| Test branch | O'chirildi, GET `404` |
| Test category | Qoldi, delete endpoint yo'q |
| Generic PNG upload | Qoldi, delete endpoint yo'q |
| Notifications | O'qilgan holatga o'tdi |
| Mavjud orderlar | Statusi o'zgartirilmadi |

## Frontendda Tuzatilgan Mosliklar

- Company create/edit `billing_day` validatsiyasi `1..31` dan `1..28` ga
  moslashtirildi.
- Billing day picker'da 29-31 kunlar tanlanmaydi.
- Branch va kitchen create formalarida `lat`/`lng` majburiy qilindi; endi
  joylashuv tanlanmasa `0,0` yoki `undefined` yuborilmaydi.
- API overview'dagi health endpoint prefiksi tuzatildi.
- Kitchen image upload hujjatiga image MIME talabi qo'shildi.

## Tekshirilmagan Qism

Dashboard qayta tekshiruvida `super_admin` credential ishlatildi. Biroq
`/super-admin/users`, `/super-admin/companies` va boshqa super-admin
write/delete endpointlari bu qayta tekshiruv scope'iga kirmadi.
