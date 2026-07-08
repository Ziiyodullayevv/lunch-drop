"""LunchDrop backend — FastAPI ilovasi kirish nuqtasi.

Ishga tushirish:
    uvicorn app.main:app --reload
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.api.v1 import auth as auth_router
from app.api.v1 import company as company_router
from app.api.v1 import employee as employee_router
from app.api.v1 import kitchen as kitchen_router
from app.api.v1 import notifications as notifications_router
from app.api.v1 import super_admin as super_admin_router
from app.api.v1 import uploads as uploads_router
from app.config import settings
from app.core.exceptions import register_exception_handlers
from app.db.session import AsyncSessionLocal, engine

API_V1_PREFIX = "/api/v1"

# Swagger /docs bo'limlari — foydalanuvchi turi bo'yicha tartib + tavsif.
OPENAPI_TAGS = [
    {"name": "auth", "description": "Umumiy: admin login (telefon+parol), token yangilash, logout, me."},
    {"name": "auth-employee", "description": "Xodim (mobil ilova): telefon + OTP bilan kirish."},
    {"name": "auth-admin", "description": "Kitchen/Company admin: self-registration (vaqtinchalik token bilan) + login."},
    {"name": "super-admin", "description": "Super admin: companies/kitchens/branches CRUD, assign-kitchens, admin tasdig'i, dashboard."},
    {"name": "kitchen-admin", "description": "Oshxona admini: meals CRUD, menu-schedule, buyurtma holati (o'z oshxonasi)."},
    {"name": "company-admin", "description": "Kompaniya admini: xodimlarni tasdiqlash, ommaviy yetkazish, hisob-fakturalar."},
    {"name": "employee", "description": "Xodim: kompaniyaga qo'shilish, menyu, buyurtma berish/bekor/tasdiqlash."},
    {"name": "notifications", "description": "Xabarnomalar (in-app): ro'yxat, o'qilmaganlar soni, o'qilgan deb belgilash."},
    {"name": "uploads", "description": "Fayl (rasm) yuklash — URL qaytaradi."},
    {"name": "health", "description": "Servis va DB holati."},
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown hayot sikli."""
    # Startup: hozircha qo'shimcha tayyorgarlik yo'q.
    yield
    # Shutdown: DB ulanishlarini toza yopish.
    await engine.dispose()


app = FastAPI(
    title=settings.app_name,
    description="Korporativ tushlik buyurtma platformasi — Backend API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{API_V1_PREFIX}/openapi.json",
    openapi_tags=OPENAPI_TAGS,
    lifespan=lifespan,
)

# CORS — faqat ishonchli domenlar (security.md).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handlerlar — izchil {"detail": ...} formati.
register_exception_handlers(app)

# Yuklangan rasmlar (S3 sozlanmagan bo'lsa) — /media orqali ko'rsatiladi.
_media_dir = Path(settings.media_dir)
_media_dir.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(_media_dir)), name="media")


@app.get(f"{API_V1_PREFIX}/health", tags=["health"], summary="Ilova holati")
async def health() -> dict[str, str]:
    """Ilova ishlayotganini bildiradi (DB tekshirmaydi)."""
    return {"status": "ok", "app": settings.app_name, "env": settings.env}


@app.get(
    f"{API_V1_PREFIX}/health/db",
    tags=["health"],
    summary="Ma'lumotlar bazasi ulanishi",
)
async def health_db() -> JSONResponse:
    """PostgreSQL ulanishini `SELECT 1` bilan tekshiradi."""
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return JSONResponse({"status": "ok", "database": "up"})
    except SQLAlchemyError:
        # Ichki tafsilotlar (stack trace) oshkor qilinmaydi (security.md).
        return JSONResponse(
            status_code=503,
            content={"status": "error", "database": "down"},
        )


# --- Routerlar ---
app.include_router(auth_router.router)
app.include_router(super_admin_router.router)
app.include_router(kitchen_router.router)
app.include_router(company_router.router)
app.include_router(employee_router.router)
app.include_router(notifications_router.router)
app.include_router(uploads_router.router)
