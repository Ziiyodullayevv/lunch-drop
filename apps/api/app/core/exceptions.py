"""Ilova xatolari va global handlerlar.

Barcha xato javoblari izchil `{"detail": "..."}` formatida qaytadi (api.md).
Ichki tafsilotlar (stack trace, DB struktura) oshkor qilinmaydi (security.md).
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import structlog

log = structlog.get_logger()


class AppException(Exception):
    """Barcha biznes xatolari uchun baza."""

    status_code: int = 500
    detail: str = "Ichki server xatosi"

    def __init__(self, detail: str | None = None) -> None:
        if detail is not None:
            self.detail = detail
        super().__init__(self.detail)


class NotFoundError(AppException):
    status_code = 404
    detail = "Topilmadi"


class AuthError(AppException):
    status_code = 401
    detail = "Autentifikatsiya xatosi"


class PermissionDeniedError(AppException):
    status_code = 403
    detail = "Ruxsat yo'q"


class ConflictError(AppException):
    status_code = 409
    detail = "Ziddiyat"


class RateLimitError(AppException):
    status_code = 429
    detail = "Juda ko'p urinish. Birozdan keyin urinib ko'ring"


class ValidationAppError(AppException):
    status_code = 422
    detail = "Noto'g'ri ma'lumot"


def register_exception_handlers(app: FastAPI) -> None:
    """Global exception handlerlarni ilovaga ulaydi."""

    @app.exception_handler(AppException)
    async def _app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    @app.exception_handler(Exception)
    async def _unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        # Kutilmagan xato — tafsilot oshkor qilinmaydi, lekin log qilinadi.
        log.error("unhandled_exception", path=request.url.path, error=str(exc))
        return JSONResponse(status_code=500, content={"detail": "Ichki server xatosi"})
