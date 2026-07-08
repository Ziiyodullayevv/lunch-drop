---
name: write-tests
description: Backend kodi uchun pytest testlari yozish tartibi — endpoint, servis va model testlari. Yangi yoki o'zgargan backend kodga test qo'shish kerak bo'lganda ishlatiladi.
---

# Test yozish

Backend uchun pytest bilan testlar yozishda:

1. **Joylashuv** — testlar `tests/` papkasida, fayllar `test_*.py`.
2. **Tuzilma** — Arrange / Act / Assert tartibida yoz.
3. **Endpoint testlari** — FastAPI `TestClient` (yoki `httpx.AsyncClient`) ishlat.
4. **Fixtures** — umumiy sozlamalarni (DB, mijoz, foydalanuvchi) `conftest.py` da fixture qil.
5. **DB izolyatsiyasi** — har test alohida tranzaksiya yoki test bazasida ishlasin.
6. **Qamrov** — muvaffaqiyatli holat + chegaviy holatlar + xato holatlar (4xx/5xx).
7. **Ishga tushirish** — `venv/bin/pytest -v`.

Maxfiy/xavfsizlik holatlarini ham tekshir (`@.claude/rules/security.md`).
