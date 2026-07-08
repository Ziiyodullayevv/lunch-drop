# Backend Changelog

## Hafta kuni filtri (available_days)

**Maqsad:** Xodim ilovada qaysi kuni ko'rsa, faqat o'sha kunga belgilangan taomlar chiqsin.

### Qilingan ishlar

**1. `FoodItem` modeliga `available_days` qo'shildi**

`models/food_item.py`
```python
available_days: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
```
ISO hafta kuni: 1=Dushanba, 7=Yakshanba. Bo'sh = hech qaysi kunda ko'rinmaydi.

---

**2. Pydantic schemaga qo'shildi**

`schemas/menu.py`
- `FoodItemRead` → `available_days: list[int] = []`
- `FoodItemCreate/Update` → `available_days: list[int] | None = None`
- Validator: faqat 1–7 oralig'idagi butun sonlar
- **Create default:** `None` kelsa servis `[1,2,3,4,5,6,7]` (barcha kun) qiladi — yangi taom adashib hamma kun yashirinib qolmasligi uchun. Bo'sh `[]` esa ataylab yashirish deb qabul qilinadi.

---

**3. `GET /menu` ga `?weekday` parametr**

`api/v1/menu.py`
```python
weekday: int | None = Query(None, ge=1, le=7)
```

---

**4. Service qatlamida Python filter**

`services/menu_service.py`
```python
if weekday is not None:
    items = [fi for fi in items if fi.available_days and weekday in fi.available_days]
```
ORM munosabatiga yozilmaydi — SQLAlchemy autoflush muammosi yo'q.

---

**5. Employee ham menyu ko'ra oladi**

```python
if actor.role != UserRole.EMPLOYEE:
    assert_owns_kitchen(actor, kitchen_id)
```

---

### Qanday ishlatiladi

```
Admin panel → weekday bermaydi → barcha taomlar, client-side filter
Ilova       → weekday beradi  → server filter
```
