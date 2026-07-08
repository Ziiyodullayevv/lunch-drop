# Rol va Ruxsatlar (RBAC)

## Rollar

| Rol | Biriktirilgan | Nima boshqaradi |
|-----|--------------|-----------------|
| `super_admin` | — | Hamma narsa |
| `company_admin` | `company_id` | O'z kompaniyasi: filiallar, oshxonalar, xodimlar, buyurtmalar |
| `kitchen_admin` | `kitchen_id` | O'z oshxonasi: menyu, buyurtmalar |
| `employee` | `branch_id` | Faqat o'z buyurtmalari |

## Permission funksiyalari

`app/core/permissions.py`

```python
assert_super_admin(user)
# → faqat super_admin o'ta oladi

assert_company_admin_or_above(user)
# → super_admin yoki company_admin

assert_kitchen_admin_or_above(user)
# → super_admin yoki kitchen_admin

assert_owns_company(user, company_id)
# → super_admin: har qanday
# → company_admin: faqat o'z company_id si

assert_owns_kitchen(user, kitchen_id)
# → super_admin: har qanday
# → company_admin: har qanday (kompaniyasiga tegishli bo'lsa ham)
# → kitchen_admin: faqat o'z kitchen_id si
# → employee: 403

assert_owns_branch(user, branch_id)
# → super_admin: har qanday
# → company_admin: har qanday
# → employee: faqat o'z branch_id si

assert_can_manage_categories(user)
# → super_admin va company_admin
```

## Ma'lumot filtrlari (endpoint bo'yicha)

### Kompaniyalar
- `super_admin` → barchasi
- `company_admin` → faqat o'zi

### Filiallar
- `super_admin` → barchasi
- `company_admin` → o'z kompaniyasining filiallari

### Oshxonalar
- `super_admin` → barchasi
- `company_admin` → o'z kompaniyasiga biriktirilganlar
- `kitchen_admin` → faqat o'zi
- `employee` → o'z branchiga ulangan oshxonalar (`/onboarding/kitchens`)

### Menyu
- `super_admin`, `company_admin`, `kitchen_admin` → `assert_owns_kitchen`
- `employee` → istalgan oshxona menyusini ko'ra oladi (faqat o'qish)

### Buyurtmalar
- `super_admin` → barchasi
- `company_admin` → o'z kompaniyasidagi branch buyurtmalari
- `kitchen_admin` → o'z oshxonasiga kelgan buyurtmalar
- `employee` → faqat o'zi berilgan buyurtmalar

### Guruhli buyurtmalar
- `super_admin` → barchasi
- `company_admin` → o'z kompaniyasi
- `kitchen_admin` → o'z oshxonasiga tegishlilar
- `employee` → ruxsat yo'q

### Foydalanuvchilar
- `super_admin` → barchasi
- `company_admin` → o'z kompaniyasidagi xodimlar
- `employee` → faqat `/auth/me`

## Frontend guards

```tsx
// Sahifa darajasida
<PageRoleGuard allowedRoles={['super_admin', 'company_admin']}>

// Nav darajasida (nav.tsx)
{ allowedRoles: ['super_admin'] }  // faqat shu rol ko'radi
```
