# Yandex Delivery integratsiyasi

Host: `https://b2b.taxi.yandex.net`

Bu integratsiya faqat server tomonda ishlashi kerak. Yandex OAuth tokenini admin
yoki mobile klientga yuborish mumkin emas. Hozirgi frontend prototipida
`admin/src/app/api/yandex-delivery/route.ts` server-side BFF sifatida ishlaydi.

## Asosiy qaror

Bitta Yandex claim bitta xodim buyurtmasiga emas, quyidagi guruhga yaratiladi:

```text
kitchen_id + branch_id + target_date
```

Bir oshxonadan bir filialga bir kunda ketadigan barcha `Order` yozuvlari bitta
`Delivery` jo'natmasiga biriktiriladi. Aks holda har bir xodim uchun alohida
kuryer chaqiriladi.

Hozirgi `Order.status` ovqat buyurtmasining holati. Yandex statusini shu maydonda
to'liq saqlab bo'lmaydi. Alohida `Delivery` modeli zarur.

## Yandex API oqimi

O'zbekistondagi joriy frontend prototipida:

1. `POST /b2b/cargo/integration/v2/check-price`
   - Mijozga boshlang'ich narx va taxminiy vaqtni ko'rsatadi.
   - Javobdagi narx yakuniy narx emas.
2. `POST /b2b/cargo/integration/v2/claims/create?request_id=<uuid>`
   - Claim yaratadi.
   - `request_id` idempotency token sifatida bazada saqlanadi.
   - Timeout yoki `5xx` bo'lsa aynan shu `request_id` bilan qayta yuboriladi.
3. `POST /b2b/cargo/integration/v2/claims/info?claim_id=<id>`
   - `ready_for_approval` bo'lguncha holat va yakuniy narx olinadi.
4. `POST /b2b/cargo/integration/v2/claims/accept?claim_id=<id>`
   - Body: `{ "version": <claims/info.version> }`.
   - Offer `ready_for_approval` bo'lgandan keyin 10 daqiqa amal qiladi.
5. `POST /b2b/cargo/integration/v2/claims/journal`
   - Cursor bilan status va narx o'zgarishlarini oladi.
6. `POST /b2b/cargo/integration/v2/claims/info?claim_id=<id>`
   - Status, courier info va umumiy ETA uchun source of truth.
7. `POST /b2b/cargo/integration/v2/claims/points-eta?claim_id=<id>`
   - Pickup va destination nuqtalariga aniq ETA beradi.
8. `GET /b2b/cargo/integration/v2/claims/tracking-links?claim_id=<id>`
   - Mijozga ko'rsatish mumkin bo'lgan kuzatuv havolasini beradi.

`offers/calculate` rasmiy hujjat bo'yicha faqat Rossiya uchun. O'zbekistonda
`check-price` ishlatiladi. Account uchun mavjud `taxi_class` va `cargo_options`
qiymatlari Yandex manageri bilan tasdiqlanishi kerak.

## Kerakli backend modellari

### `deliveries`

| Maydon | Izoh |
|---|---|
| `id` | LunchDrop UUID |
| `kitchen_id` | Jo'natuvchi oshxona |
| `branch_id` | Qabul qiluvchi filial |
| `target_date` | Yetkazish sanasi |
| `provider` | `yandex` |
| `request_id` | `claims/create` idempotency UUID, unique |
| `claim_id` | Yandex claim ID, unique |
| `status` | LunchDrop delivery status |
| `provider_status` | Yandex raw status |
| `version` | Yandex claim version |
| `quoted_price` | `check-price` qiymati |
| `final_price` | `claims/info.pricing.final_price` |
| `currency` | Provider currency code |
| `eta_minutes` | Umumiy ETA |
| `destination_eta` | Destination uchun vaqt |
| `courier_name` | `performer_info.courier_name` |
| `transport_type` | `performer_info.transport_type` |
| `car_model` | Nullable |
| `car_number` | Nullable |
| `tracking_url` | Destination sharing link |
| `provider_updated_at` | Yandex `updated_ts` |
| `last_synced_at` | Oxirgi muvaffaqiyatli sync |
| `error_code` | Nullable |
| `error_message` | Nullable |
| `created_at`, `updated_at` | Audit |

Unique constraint:

```text
(kitchen_id, branch_id, target_date)
```

Terminal claim tugaganidan keyin qayta jo'natish kerak bo'lsa alohida
`attempt` ustuni yoki `delivery_attempts` jadvali ishlatiladi.

### `delivery_orders`

| Maydon | Izoh |
|---|---|
| `delivery_id` | `deliveries.id` |
| `order_id` | `orders.id`, unique |

### `delivery_sync_state`

Yandex `claims/journal` uchun oxirgi `cursor` bazada saqlanadi. Bir nechta
backend instance ishlaganda worker uchun distributed lock kerak.

## LunchDrop status modeli

```text
draft
quoted
estimating
awaiting_approval
courier_searching
courier_assigned
arrived_pickup
in_transit
arrived_destination
delivered
returning
returned
cancelled
failed
```

Yandex mapping:

| Yandex status | LunchDrop delivery status | `Order.status` |
|---|---|---|
| `new`, `estimating` | `estimating` | o'zgarmaydi |
| `ready_for_approval` | `awaiting_approval` | o'zgarmaydi |
| `accepted`, `performer_lookup`, `performer_draft` | `courier_searching` | `preparing` |
| `performer_found` | `courier_assigned` | `preparing` |
| `pickup_arrived`, `ready_for_pickup_confirmation` | `arrived_pickup` | `preparing` |
| `pickuped` | `in_transit` | `on_the_way` |
| `delivery_arrived`, `ready_for_delivery_confirmation` | `arrived_destination` | `on_the_way` |
| `delivered`, `delivered_finish` | `delivered` | `delivered` |
| `returning`, `return_arrived`, `ready_for_return_confirmation` | `returning` | `on_the_way` |
| `returned`, `returned_finish` | `returned` | alohida operator qarori |
| cancel statuslari | `cancelled` | avtomatik `cancelled` qilinmaydi |
| `failed`, `estimating_failed`, `performer_not_found` | `failed` | avtomatik `cancelled` qilinmaydi |

`delivery_arrived` faqat kuryer manzilga kelganini bildiradi. Buyurtmani shu
statusda `delivered` qilish noto'g'ri; tasdiqlangan topshirish uchun Yandex
`delivered` yoki `delivered_finish` statusi kutiladi.

## LunchDrop backend endpointlari

Kitchen admin:

```text
POST /api/v1/kitchen/deliveries/quote
POST /api/v1/kitchen/deliveries
POST /api/v1/kitchen/deliveries/{delivery_id}/accept
GET  /api/v1/kitchen/deliveries/{delivery_id}
POST /api/v1/kitchen/deliveries/{delivery_id}/cancel
```

Quote request:

```json
{
  "branch_id": "uuid",
  "target_date": "2026-06-12",
  "taxi_class": "express",
  "cargo_options": ["thermobag"]
}
```

Quote response:

```json
{
  "price": "45000.00",
  "currency": "UZS",
  "eta_minutes": 28,
  "distance_meters": 9300,
  "expires_at": "2026-06-12T08:20:00Z"
}
```

Create request:

```json
{
  "branch_id": "uuid",
  "target_date": "2026-06-12",
  "taxi_class": "express",
  "cargo_options": ["thermobag"]
}
```

Create endpoint transaction ichida:

1. Shu kitchen, branch va sana uchun eligible orderlarni lock qiladi.
2. Mavjud aktiv delivery borligini tekshiradi.
3. `Delivery` va `delivery_orders` yozuvlarini yaratadi.
4. Yandex `claims/create` ni chaqiradi.
5. `claim_id`, `request_id` va raw response'ni saqlaydi.

Public callback:

```text
POST /api/v1/integrations/yandex-delivery/callback
```

Callback faqat sync'ni tezlatadigan signal. Querydagi `claim_id` asosida
statusni to'g'ridan-to'g'ri yangilash mumkin emas. Backend Yandex
`claims/info` ni o'zi chaqirib, haqiqiy statusni tekshiradi.

## Polling va callback

Tavsiya:

- `callback_properties.callback_url` qo'shiladi;
- callback kelganda job queue'ga bitta sync task qo'yiladi;
- `claims/journal` cursor bilan har 10-20 sekundda ishlaydi;
- aktiv claim uchun zarur bo'lsa `claims/info` va `points-eta` chaqiriladi;
- terminal statuslarda polling to'xtaydi;
- `429` va `5xx` da exponential backoff va jitter ishlatiladi;
- `updated_ts` eski bo'lsa lokal holat orqaga qaytarilmaydi.

Yandex callback mexanizmini eskirgan va ishonchsiz deb belgilaydi. Uni
`claims/journal` va fallback polling bilan birga ishlatish kerak. Rasmiy
tavsiya eski javob holatida 5-30 sekunddan keyin qayta so'rov yuborishdir.

Ko'p aktiv delivery bo'lsa har biri uchun alohida `claims/info` urish o'rniga
`claims/journal` va `claims/bulk_info` ishlatiladi.

## Yetishmayotgan LunchDrop ma'lumotlari

Hozirgi API'da:

- filialda `address`, `lat`, `lng` bor;
- oshxonada `lat`, `lng`, `phone` bor, lekin to'liq `address` yo'q;
- filial uchun kuryer bog'lanadigan kontakt telefon yo'q;
- taom yoki jo'natma uchun real `weight`, `length`, `width`, `height` yo'q;
- kitchen orders individual orderlar, delivery group modeli yo'q.

Qo'shish kerak:

1. Kitchen uchun `address`.
2. Branch uchun `contact_name`, `contact_phone`, ixtiyoriy `entrance`,
   `floor`, `door_code`, `delivery_comment`.
3. Meal yoki packaging konfiguratsiyasi uchun og'irlik va gabaritlar.
4. Kitchen + branch + date bo'yicha grouped shipment endpointi.
5. Delivery narxini kim to'lashi va invoice'da qayerga yozilishi.

Yandex koordinata tartibi:

```text
[longitude, latitude]
```

LunchDrop'dagi `lat`, `lng` Yandex requestida `[lng, lat]` ko'rinishida
yuboriladi.

## Admin UI

Kitchen order sahifasida individual order action o'rniga grouped shipment
kartasi bo'ladi:

1. `Narxni hisoblash`.
2. Narx, ETA, masofa va tarifni ko'rsatish.
3. `Kuryer chaqirish`.
4. `Kuryer qidirilmoqda`.
5. Courier ismi, transport, ETA va tracking link.
6. `Manzilga yetib keldi`.
7. `Yetkazildi`.

Frontend backend delivery detail endpointini 10-20 sekundda refetch qilishi
mumkin. Frontend Yandex API'ni bevosita chaqirmaydi.

Hozirgi Next.js prototipi:

- `YANDEX_DELIVERY_TOKEN` server env yoki reload qilinadigan secret fayldan
  o'qiydi;
- LunchDrop `kitchen_admin` JWT rolini har so'rovda tekshiradi;
- `check-price`, `claims/create`, `claims/accept`, `claims/info` va
  `claims/tracking-links` metodlarini whitelist orqali proxy qiladi;
- aktiv claimlarni 15 sekundda polling qiladi;
- `pickuped` holatida LunchDrop orderlarini `on_the_way` qiladi;
- `delivered` yoki `delivered_finish` holatida LunchDrop orderlarini
  `delivered` qiladi;
- claim va idempotency `request_id` ni browser localStorage'da vaqtincha
  saqlaydi;
- filial route ma'lumotlarini keyingi jo'natmalar uchun browserda eslab qoladi.

Bu faqat birinchi bosqich. Productionda claim, request ID, polling va status
mapping browser localStorage'dan backend bazasi va worker'ga ko'chiriladi.

## Xavfsizlik va observability

- `YANDEX_DELIVERY_TOKEN` faqat backend secret storage'da saqlanadi.
- Lokal prototip default holatda
  `admin/.secrets/yandex-delivery-token` faylini har so'rovda qayta o'qiydi.
  Token qo'shilganda yoki almashtirilganda restart talab qilinmaydi.
- Yandex Delivery tokeni muddatsiz. Refresh-token oqimi yo'q; biznes kabineti
  paroli o'zgartirilsa yangi tokenni secret storage'ga qo'yish kerak.
- Request va response loglarida token va telefonlar maskalanadi.
- `request_id`, `claim_id`, LunchDrop `delivery_id` barcha loglarda bo'ladi.
- Callback darhol `200` qaytaradi, og'ir sync queue'da bajariladi.
- Duplicate create'ga DB unique constraint va Yandex idempotency birga
  himoya beradi.
- Claim create/accept/cancel amallari audit logga yoziladi.
- Alertlar: ketma-ket `429`, `5xx`, `performer_not_found`, 60 sekunddan eski
  aktiv sync, callback backlog.

## Ishga tushirish tartibi

1. Yandex Delivery corporate account va production/test token olish.
2. O'zbekiston hududi, valuta, `express`/`courier` va `thermobag`
   imkoniyatlarini Yandex manager bilan tasdiqlash.
3. Backend migration va provider client.
4. Quote/create/accept/info/cancel endpointlari.
5. Journal worker, callback va status mapping.
6. Grouped shipment API.
7. Admin UI.
8. Mobile'da ETA, status va tracking link.
9. Test account bilan end-to-end delivery.

## Rasmiy hujjatlar

- [Quickstart](https://yandex.ru/support/delivery-profile/ru/api/express/quickstart)
- [API metodlari](https://yandex.ru/support/delivery-profile/ru/api/express/overview)
- [Claim lifecycle va statuslar](https://yandex.ru/support/delivery-profile/ru/api/express/claim-process)
- [Check price](https://yandex.ru/support/delivery-profile/ru/api/express/openapi/IntegrationV2CheckPrice)
- [Create claim va callback](https://yandex.ru/support/delivery-profile/ru/api/express/openapi/IntegrationV2ClaimsCreate)
- [Claim info](https://yandex.ru/support/delivery-profile/ru/api/express/openapi/IntegrationV2ClaimsInfo)
- [Accept claim](https://yandex.ru/support/delivery-profile/ru/api/express/openapi/IntegrationV2ClaimsAccept)
- [Claims journal](https://yandex.ru/support/delivery-profile/ru/api/express/openapi/IntegrationV2ClaimsJournal)
- [Points ETA](https://yandex.ru/support/delivery-profile/ru/api/express/openapi/IntegrationV2ClaimsPointsEta)
- [Tracking links](https://yandex.ru/support/delivery-profile/ru/api/express/openapi/IntegrationV2ClaimsTrackingLinks)
