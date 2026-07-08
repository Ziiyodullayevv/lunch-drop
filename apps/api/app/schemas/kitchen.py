"""Kitchen schemalar (v4.1) — lat/lng majburiy, text location yo'q."""

from datetime import datetime, time

from pydantic import BaseModel, ConfigDict, Field


class KitchenCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    phone: str | None = Field(default=None, max_length=32)
    image_url: str | None = Field(default=None, max_length=512)
    lat: float
    lng: float
    order_cutoff_time: time = time(10, 30)
    delivery_start_time: time = time(12, 30)
    delivery_end_time: time = time(13, 0)
    is_active: bool = True


class KitchenUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    phone: str | None = Field(default=None, max_length=32)
    image_url: str | None = Field(default=None, max_length=512)
    lat: float | None = None
    lng: float | None = None
    order_cutoff_time: time | None = None
    delivery_start_time: time | None = None
    delivery_end_time: time | None = None
    is_active: bool | None = None


class KitchenSettingsUpdate(BaseModel):
    """Kitchen admin o'z oshxonasi sozlamalari — vaqtlar, nom, holat. Lokatsiya (lat/lng) super_admin'da."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    phone: str | None = Field(default=None, max_length=32)
    order_cutoff_time: time | None = None
    delivery_start_time: time | None = None
    delivery_end_time: time | None = None
    is_active: bool | None = None


class KitchenRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str | None
    phone: str | None
    image_url: str | None
    lat: float
    lng: float
    order_cutoff_time: time
    delivery_start_time: time
    delivery_end_time: time
    is_active: bool
    created_at: datetime


class AssignKitchensRequest(BaseModel):
    kitchen_ids: list[str] = Field(default_factory=list)
