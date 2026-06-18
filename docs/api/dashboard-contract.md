# Dashboard Backend Contract

## Yakuniy holat

2026-06-14 kuni backend OpenAPI va `company_admin`/`kitchen_admin` live
response'lari qayta tekshirildi. Backend eski dashboardda yetishmagan biznes
metrikalarni `SummaryCard.key` enumiga qo'shgan va response cheklovlarini
schema'da mustahkamlagan. Frontend yangi `DashboardResponse` formatiga ulandi.

## Endpointlar

| Rol | Endpoint |
|---|---|
| `super_admin` | `GET /super-admin/dashboard?year=2026` |
| `company_admin` | `GET /company/dashboard?year=2026` |
| `kitchen_admin` | `GET /kitchen/dashboard?year=2026` |

`year` berilmasa backend `Asia/Tashkent` vaqt zonasidagi joriy yilni ishlatadi.

## Hozirgi backend formati

```json
{
  "year": 2026,
  "timezone": "Asia/Tashkent",
  "generated_at": "2026-06-13T10:30:00+05:00",
  "summary": [
    {
      "key": "orders_today",
      "value": 3,
      "trend_percent": 0,
      "history": [
        { "date": "2026-06-06", "value": 0 },
        { "date": "2026-06-07", "value": 0 },
        { "date": "2026-06-08", "value": 0 },
        { "date": "2026-06-09", "value": 1 },
        { "date": "2026-06-10", "value": 0 },
        { "date": "2026-06-11", "value": 1 },
        { "date": "2026-06-12", "value": 1 },
        { "date": "2026-06-13", "value": 3 }
      ]
    }
  ],
  "order_status_totals": {
    "created": 0,
    "preparing": 0,
    "on_the_way": 0,
    "delivered": 3,
    "cancelled": 0
  },
  "monthly_orders": {
    "year": 2026,
    "delivered": [0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0],
    "cancelled": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  }
}
```

Live response va OpenAPI tekshiruvida:

- barcha endpointlar `200` qaytardi;
- har bir summary history'si 8 ta nuqtadan iborat;
- barcha 5 ta order status mavjud;
- `delivered` va `cancelled` 12 tadan qiymat qaytardi;
- 2024, 2025 va 2026 yillari to'g'ri ishladi;
- timezone `Asia/Tashkent` bo'ldi.

## Frontend integratsiyasi

Frontend role bo'yicha quyidagi endpointni tanlaydi:

- `super_admin` -> `/super-admin/dashboard`
- `company_admin` -> `/company/dashboard`
- `kitchen_admin` -> `/kitchen/dashboard`

`summary` elementlari avtomatik kartalarga, `order_status_totals` donut
chartga, `monthly_orders` esa 12 oylik delivered/cancelled chartga aylantiriladi.
Pul qiymatlari (`revenue_total`, `monthly_cost`, `weekly_revenue`) UZS formatida
ko'rsatiladi. `trend_percent: null` bo'lsa noto'g'ri `0%` chiqarilmaydi.

## Chartlar

`order_status_totals` donut chartni quradi. `monthly_orders` tanlangan yil uchun
12 oylik delivered/cancelled chartni quradi.

## OpenAPI kamchiliklari

2026-06-14 holatida oldingi OpenAPI kamchiliklari tuzatilgan:

- `SummaryCard.key` barcha qo'llab-quvvatlanadigan keylar enumiga ega;
- `history` uchun `minItems: 8` va `maxItems: 8` mavjud;
- oylik massivlar uchun `minItems: 12` va `maxItems: 12` mavjud;
- `timezone` qiymati `Asia/Tashkent` const bilan cheklangan.
**
