"""Fayl (rasm) saqlash. DB'da faqat URL turadi.

- S3 sozlangan bo'lsa (kalitlar bor) — S3'ga yuklanadi.
- Aks holda — serverda lokal `media_dir` ichiga saqlanadi, `/media/...` URL qaytadi.

Sinxron — endpoint'da run_in_threadpool orqali chaqiriladi.
"""

import uuid
from pathlib import Path

from app.config import settings

ALLOWED_EXTS = {"jpg", "jpeg", "png", "webp", "gif"}


def s3_configured() -> bool:
    return bool(settings.s3_bucket and settings.s3_access_key and settings.s3_secret_key)


def _ext(filename: str, content_type: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTS:
        # content_type'dan aniqlashga urinish (masalan image/png -> png)
        ext = (content_type.rsplit("/", 1)[-1].lower() if "/" in content_type else "")
        ext = "jpg" if ext == "jpeg" else ext
    return ext if ext in ALLOWED_EXTS else "bin"


def _upload_s3(content: bytes, key: str, content_type: str) -> str:
    import boto3

    client = boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url or None,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
    )
    client.put_object(
        Bucket=settings.s3_bucket, Key=key, Body=content,
        ContentType=content_type, ACL="public-read",
    )
    if settings.s3_endpoint_url:
        return f"{settings.s3_endpoint_url.rstrip('/')}/{settings.s3_bucket}/{key}"
    return f"https://{settings.s3_bucket}.s3.amazonaws.com/{key}"


def _save_local(content: bytes, key: str) -> str:
    """Faylni media_dir/key ga saqlaydi va URL qaytaradi."""
    path = Path(settings.media_dir) / key
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    rel = f"/media/{key}"
    base = settings.public_base_url.rstrip("/")
    return f"{base}{rel}" if base else rel


def upload_image(content: bytes, filename: str, content_type: str, prefix: str = "meals") -> str:
    """Rasmni saqlab (S3 yoki lokal), ochiq URL qaytaradi."""
    key = f"{prefix}/{uuid.uuid4().hex}.{_ext(filename, content_type)}"
    if s3_configured():
        return _upload_s3(content, key, content_type)
    return _save_local(content, key)
