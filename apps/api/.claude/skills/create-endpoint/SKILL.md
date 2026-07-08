---
name: create-endpoint
description: Yangi FastAPI backend endpoint yaratish uchun bosqichma-bosqich tartib — schema, model, servis, router, test. Backend'ga yangi API endpoint qo'shish kerak bo'lganda ishlatiladi.
---

# Endpoint yaratish

Yangi FastAPI endpoint qo'shishda quyidagi tartibga amal qil:

1. **Schema** — `schemas/` da Pydantic request/response modellarini yarat.
2. **Model** — kerak bo'lsa `models/` da DB modelini qo'sh (`@.claude/rules/database.md`).
3. **Servis** — biznes logikani `services/` qatlamida yoz (router'da emas).
4. **Router** — `routers/` da endpointni yarat:
   - To'g'ri HTTP metod va `/api/v1/...` prefiks.
   - `response_model`, `status_code`, docstring ko'rsat.
   - Himoya kerak bo'lsa autentifikatsiya dependency qo'sh.
5. **Ulash** — router'ni asosiy `app` ga registratsiya qil.
6. **Test** — `write-tests` skill bilan testlar qo'sh.
7. **Tekshirish** — `venv/bin/pytest` ishga tushir.

`@.claude/rules/api.md` va `@.claude/rules/security.md` qoidalariga rioya qil.
