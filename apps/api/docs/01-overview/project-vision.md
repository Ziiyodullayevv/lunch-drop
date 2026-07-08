# Loyiha maqsadi

**LunchDrop** — korporativ tushlik buyurtma platformasi.

## Asosiy g'oya

Kompaniya xodimlari har kuni oshxonadan tushlik buyurtma beradi. Platforma:

1. Xodim ilovadan taom tanlaydi va buyurtma beradi
2. Bir filial + bir oshxona bo'yicha barcha buyurtmalar avtomatik guruhlanadi
3. Oshxona bitta umumiy guruhli buyurtma ko'radi va tayyorlaydi
4. Tayyor bo'lgach filialga yetkaziladi

## Muammo nima?

- Har bir xodim alohida qo'ng'iroq qilishi kerak emas
- Oshxona ko'p kichik buyurtma o'rniga bir umumiy ro'yxat oladi
- Kompaniya xodimlar ovqatini nazorat qila oladi

## Texnologiya

| Qism | Stack |
|------|-------|
| Backend | FastAPI + SQLAlchemy async + PostgreSQL |
| Admin panel | Next.js App Router + MUI |
| Mobile | Expo (React Native) + Tamagui |

## Rollar

| Rol | Kim |
|-----|-----|
| `super_admin` | Platforma egasi — hamma narsani boshqaradi |
| `company_admin` | Kompaniya rahbari — o'z filial va xodimlarini boshqaradi |
| `kitchen_admin` | Oshxona egasi — menyu va buyurtmalarni ko'radi |
| `employee` | Oddiy xodim — buyurtma beradi |
