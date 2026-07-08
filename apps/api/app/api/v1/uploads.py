"""Fayl yuklash — rasmni yuklab, URL qaytaradi (frontend uni image_url/logo_url ga qo'yadi)."""

from fastapi import APIRouter, Depends, File, Query, UploadFile
from starlette.concurrency import run_in_threadpool

from app.core.exceptions import ValidationAppError
from app.dependencies import get_current_user
from app.integrations.s3 import upload_image
from app.models.user import User

router = APIRouter(prefix="/api/v1/uploads", tags=["uploads"])

MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB


@router.post("/image", summary="Rasm yuklash (URL qaytaradi)")
async def upload(
    file: UploadFile = File(...),
    prefix: str = Query("misc", description="meals / logos / misc"),
    _: User = Depends(get_current_user),
) -> dict:
    if not (file.content_type or "").startswith("image/"):
        raise ValidationAppError("Faqat rasm fayllari qabul qilinadi")
    content = await file.read()
    if len(content) > MAX_IMAGE_BYTES:
        raise ValidationAppError("Rasm hajmi 5 MB dan oshmasin")
    url = await run_in_threadpool(
        upload_image, content, file.filename or "", file.content_type or "image/jpeg", prefix
    )
    return {"url": url}
