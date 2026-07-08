# Ma'lumotlar bazasi qoidalari

- ORM sifatida SQLAlchemy (yoki SQLModel) ishlatiladi.
- Schema o'zgarishlari faqat migratsiyalar orqali (Alembic). Qo'lda DB o'zgartirma.
- Jadval nomlari ko'plik va snake_case (`orders`, `order_items`).
- Har bir jadvalda `id`, `created_at`, `updated_at` ustunlari bo'lsin.
- Tashqi kalitlar (foreign keys) aniq belgilansin, indekslar qo'shilsin.
- N+1 so'rovlardan saqlan — kerakli joyda `joinedload`/`selectinload` ishlat.
- Migratsiyalarni har doim ham `upgrade`, ham `downgrade` bilan yoz.
- Maxfiy ma'lumotlarni (parol) ochiq saqlama — hash qil (`@.claude/rules/security.md`).
