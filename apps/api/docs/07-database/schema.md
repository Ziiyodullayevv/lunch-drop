# Database Schema

**DB:** PostgreSQL 16 | **ORM:** SQLAlchemy 2.0 async | **Migrations:** Alembic

---

## Jadvallar

| Jadval | Model | Asosiy maydonlar |
|--------|-------|-----------------|
| `users` | `User` | `phone`, `email`, `password_hash`, `role`, `branch_id`, `kitchen_id`, `company_id` |
| `companies` | `Company` | `name`, `status` |
| `branches` | `Branch` | `company_id`, `name`, `address`, `payment_day` |
| `kitchens` | `Kitchen` | `name`, `cutoff_time`, `delivery_start_time`, `delivery_end_time`, `status` |
| `kitchen_branch_mappings` | `KitchenBranchMapping` | `kitchen_id`, `branch_id`, `active` |
| `menus` | `Menu` | `kitchen_id`, `title`, `sort_order`, `active` |
| `food_items` | `FoodItem` | `menu_id`, `name`, `price`, `available`, `available_days` |
| `food_categories` | `FoodCategory` | `name`, `kitchen_id` |
| `food_tags` | `FoodTag` | `name`, `kitchen_id` |
| `orders` | `Order` | `user_id`, `branch_id`, `kitchen_id`, `status`, `total_price` |
| `order_items` | `OrderItem` | `order_id`, `food_item_id`, `quantity`, `price` |
| `grouped_orders` | `GroupedOrder` | `branch_id`, `kitchen_id`, `status`, `delivery_time` |
| `notifications` | `Notification` | `user_id`, `title`, `read` |
| `invite_codes` | `InviteCode` | `code`, `branch_id`, `used` |
| `refresh_tokens` | `RefreshToken` | `user_id`, `token`, `expires_at` |
| `payments` | `Payment` | `order_id`, `amount`, `status` |

---

## Muhim ustunlar

### `available_days` (food_items)

```sql
available_days JSON NOT NULL DEFAULT '[]'
```

ISO hafta kunlari ro'yxati. `[1, 2, 3, 4, 5]` = Du–Ju. API create'da maydon berilmasa server `[1..7]` (barcha kun) qiladi; bo'sh `[]` = ataylab hech qaysi kunda ko'rinmaydi. DB darajasidagi `DEFAULT '[]'` faqat to'g'ridan-to'g'ri INSERT uchun zaxira.

### `cutoff_time`, `delivery_start_time`, `delivery_end_time` (kitchens)

```sql
cutoff_time          TIME  DEFAULT '10:30'
delivery_start_time  TIME  DEFAULT '12:30'
delivery_end_time    TIME  DEFAULT '13:00'
```

Avtomatik status o'zgarish `workers/tasks/status_transitions.py` da shu vaqtlarga asoslanadi.

### `payment_day` (branches)

```sql
payment_day INTEGER  -- oylik to'lov kuni (1–31)
```

### Soft delete

`users`, `companies`, `branches`, `kitchens`, `food_items` modellarida `deleted_at TIMESTAMP` mavjud. O'chirilganda `deleted_at` o'rnatiladi, DB dan o'chirilmaydi.

---

## Model bazasi

```python
class MyModel(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "my_models"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
```

- `TimestampMixin` → `created_at`, `updated_at`
- `SoftDeleteMixin` → `deleted_at`

---

## Migration

```bash
cd backend

# Yangi migration yaratish
.venv/bin/alembic revision -m "qisqa_nom" --rev-id 000X

# Qo'llash
.venv/bin/alembic upgrade head

# Joriy holat
.venv/bin/alembic current
```

Migration namunasi:
```python
def upgrade():
    op.add_column("food_items",
        sa.Column("available_days", sa.JSON(), nullable=False, server_default="[]"))

def downgrade():
    op.drop_column("food_items", "available_days")
```
