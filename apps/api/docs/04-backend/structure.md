# Backend Tuzilmasi

**Stack:** FastAPI + SQLAlchemy 2.0 async + PostgreSQL + Alembic

## Arxitektura qatlamlari

```
┌──────────────────────────────────┐
│   API Layer  (api/v1/*.py)       │  HTTP, validatsiya, auth
├──────────────────────────────────┤
│   Service Layer (*_service.py)   │  Biznes logika
├──────────────────────────────────┤
│   Repository Layer (*_repo.py)   │  DB so'rovlar
├──────────────────────────────────┤
│   Models  (models/*.py)          │  SQLAlchemy ORM
└──────────────────────────────────┘
```

## Papkalar

```
backend/app/
├── main.py                  # FastAPI app, middleware, router
├── config.py                # Settings (.env dan)
├── dependencies.py          # get_current_user, get_session
│
├── api/v1/                  # HTTP endpoint'lar
│   ├── auth.py
│   ├── branches.py
│   ├── companies.py
│   ├── grouped_orders.py
│   ├── kitchens.py
│   ├── menu.py
│   ├── notifications.py
│   ├── onboarding.py
│   ├── orders.py
│   ├── payments.py
│   ├── stats.py
│   └── users.py
│
├── core/
│   ├── exceptions.py        # AppException, NotFoundError, PermissionDeniedError
│   ├── permissions.py       # assert_* funksiyalar
│   ├── security.py          # JWT RS256 sign/verify
│   └── logging.py           # structlog konfiguratsiyasi
│
├── models/                  # SQLAlchemy ORM modellari
├── schemas/                 # Pydantic DTO (Create/Update/Read)
├── services/                # Biznes logika
├── repositories/            # DB access
│
├── workers/
│   ├── scheduler.py         # APScheduler — avtomatik vazifalar
│   └── tasks/
│       ├── status_transitions.py  # cutoff/delivery vaqtida status o'zgartirish
│       └── notifications.py       # push/Telegram notification
│
├── integrations/
│   ├── s3.py                # Rasm yuklash
│   └── sms.py               # SMS OTP
│
└── db/
    ├── session.py           # AsyncSession factory
    └── base.py              # DeclarativeBase
```

## Asosiy qoidalar

- Endpoint faqat service'ni chaqiradi — biznes logika yozmaydi
- Service repo'larni chaqiradi — SQL yozmaydi
- Lazy loading ishlatilmaydi → `selectinload()` majburiy
- Har bir yangi model maydoni → Alembic migration majburiy
- `expire_on_commit=False` — commit dan keyin ob'ektlarga kirish mumkin

## Error handling

```python
# core/exceptions.py
NotFoundError       → 404
PermissionDeniedError → 403
ValidationError     → 422
```

Global handler `main.py` da `{"detail": "..."}` formatida qaytaradi.

## Logging

`structlog` — JSON formatida. Har bir muhim amal log yozadi.

## Ishga tushirish

```bash
cd backend
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
