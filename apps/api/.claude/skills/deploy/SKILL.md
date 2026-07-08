---
name: deploy
description: LunchDrop backend'ini deploy qilish tartibi — tekshiruvlar, migratsiya, env, ishga tushirish. Ilovani serverga chiqarish kerak bo'lganda ishlatiladi.
---

# Deploy

Backend'ni deploy qilishdan oldin va davomida:

1. **Deploydan oldin tekshiruv**
   - Testlar o'tadi: `venv/bin/pytest`.
   - Linter toza: `venv/bin/ruff check .`.
   - `requirements.txt` (yoki lock fayl) yangilangan.
2. **Environment** — `.env` server'da to'g'ri sozlangan (DB URL, kalitlar). Maxfiylik kodda emas.
3. **Migratsiya** — `alembic upgrade head` (DB sxemasi yangilanadi).
4. **Ishga tushirish** — production'da ASGI server (masalan `uvicorn`/`gunicorn` worker'lar bilan).
5. **Sog'liq tekshiruvi** — `/api/v1/health` endpointi javob beradimi.
6. **Orqaga qaytarish (rollback)** — muammo bo'lsa migratsiyani `downgrade` qil va oldingi versiyaga qayt.

`@.claude/rules/security.md` (CORS, maxfiylik) qoidalariga rioya qil.
