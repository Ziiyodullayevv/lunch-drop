# Buyurtma oqimi

## To'liq zanjir

```
1. Xodim ilova ochadi
2. HomeScreen: bugungi kun bo'yicha taomlar ko'rinadi (?weekday=N)
3. Taom tanlaydi → savatga qo'shadi
4. POST /orders → individual buyurtma yaratiladi (status: pending)
5. BatchingService ishga tushadi → pending buyurtmalar guruhlanadi
6. GroupedOrder yaratiladi (status: sent) → oshxona xabardor qilinadi
7. cutoff_time kelganda → orders: grouped→cooking (avtomatik)
8. Oshxona tayyorlaydi → PATCH /grouped-orders/{id}/status → cooking
9. delivery_start_time → orders: cooking→ready
10. Oshxona yetkazadi → delivered
```

---

## Order status

```
pending  →  grouped  →  cooking  →  ready  →  delivered
                                            ↘  cancelled
```

| Status | Ma'no |
|--------|-------|
| `pending` | Buyurtma berildi, hali guruhlanmagan |
| `grouped` | Guruhli buyurtmaga qo'shildi |
| `cooking` | Oshxona tayyorlamoqda |
| `ready` | Tayyor, kutilmoqda |
| `delivered` | Yetkazildi |
| `cancelled` | Bekor qilindi |

---

## GroupedOrder status

```
sent  →  cooking  →  ready  →  delivered
                            ↘  cancelled
```

---

## Batching (guruplash)

`services/batching_service.py`

- Bir filial + bir oshxona bo'yicha `pending` buyurtmalar to'planadi
- Minimal guruh hajmi `settings.BATCHING_MIN_ORDERS_PER_GROUP` dan oshganda guruhlanadi
- `GroupedOrder` yaratiladi, har bir `Order.grouped_order_id` o'rnatiladi
- Oshxona va xodimlar Telegram + push notification oladi

---

## Avtomatik status o'zgarish

`workers/tasks/status_transitions.py` — APScheduler tomonidan har daqiqa ishga tushadi.

| Vaqt | Nima bo'ladi |
|------|-------------|
| `cutoff_time` dan keyin | `grouped` → `cooking` |
| `delivery_start_time` dan keyin | `cooking` → `ready` |

Har bir oshxonaning vaqtlari alohida `Kitchen.cutoff_time`, `delivery_start_time`, `delivery_end_time`.

Timezone: `Asia/Tashkent` (UTC+5, DST yo'q).

---

## Buyurtma berishda tekshiruvlar

`services/order_service.py`

1. Xodim statusi `active` bo'lishi shart (pending → 403)
2. Tanlangan oshxona xodimning branchiga ulangan bo'lishi shart (`KitchenBranchMapping`)
3. Har bir `food_item` mavjud va `available=true` bo'lishi shart
4. `cutoff_time` o'tmagan bo'lishi shart
