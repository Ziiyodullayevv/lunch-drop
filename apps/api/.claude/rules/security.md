# Xavfsizlik qoidalari

- Maxfiy ma'lumotlar (kalitlar, parollar) hech qachon kodda emas — `.env` orqali.
- Parollarni hash qil (bcrypt/argon2), hech qachon ochiq saqlama.
- Barcha kiruvchi ma'lumotni Pydantic bilan tekshir/validatsiya qil.
- SQL injection'dan saqlan — faqat ORM yoki parametrlangan so'rovlar.
- Autentifikatsiya uchun JWT yoki sessiya; tokenlarni xavfsiz sakla.
- Avtorizatsiyani har bir himoyalangan endpointda tekshir (kim nimaga ruxsatli).
- CORS'ni faqat ishonchli domenlarga ochiq qoldir.
- Xato xabarlarida ichki tafsilotlarni (stack trace, DB struktura) oshkor qilma.
- Rate limiting'ni sezgir endpointlarda (login, buyurtma) qo'lla.
- Maxfiy amallarni log qil, lekin loglarga maxfiy ma'lumot yozma.
