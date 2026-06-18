# Server secrets

Yandex Delivery tokenini Yandex biznes kabinetidagi `Integratsiya -> API`
bo'limidan bir marta oling va quyidagi faylga faqat tokenning o'zini yozing:

```text
.secrets/yandex-delivery-token
```

Token fayli Git tomonidan ignore qilinadi. Next.js route faylni har so'rovda
qayta o'qiydi, shuning uchun token qo'shilganda yoki almashtirilganda serverni
restart qilish shart emas.

Yandex Delivery tokeni muddatsiz amal qiladi. Yandex biznes kabineti paroli
o'zgartirilsa token bekor bo'ladi va yangi tokenni shu faylga yozish kerak.

Productionda lokal fayl o'rniga platformaning secret manager yoki mounted
secret volume mexanizmidan foydalaning. Boshqa fayl yo'lini berish uchun:

```env
YANDEX_DELIVERY_TOKEN_FILE=/run/secrets/yandex-delivery-token
```
