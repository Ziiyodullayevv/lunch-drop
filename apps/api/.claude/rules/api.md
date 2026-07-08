# API qoidalari

- RESTful konvensiyalarga amal qil: resurslar ko'plik otda (`/orders`, `/restaurants`).
- HTTP metodlardan to'g'ri foydalan: GET (o'qish), POST (yaratish), PUT/PATCH (yangilash), DELETE (o'chirish).
- So'rov va javoblar uchun Pydantic modellaridan foydalan (request/response schema).
- Versiyalash: barcha endpointlar `/api/v1/...` prefiksi ostida.
- Xato javoblari izchil formatda: `{ "detail": "..." }` va to'g'ri HTTP status kod.
- Har bir endpoint uchun `status_code`, `response_model` va qisqa docstring ko'rsat.
- Pagination: ro'yxat qaytaradigan endpointlarda `limit` va `offset` (yoki cursor) qo'lla.
- Biznes logikani router ichida emas, alohida servis qatlamida sakla.
