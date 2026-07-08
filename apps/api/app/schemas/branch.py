"""Branch schemalar (v4.1) — lat/lng majburiy."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class BranchCreate(BaseModel):
    company_id: str
    name: str = Field(..., min_length=1, max_length=255)
    address: str = Field(..., min_length=1)
    lat: float
    lng: float


class CompanyBranchCreate(BaseModel):
    """Company admin o'z kompaniyasiga filial qo'shadi — company_id token'dan olinadi."""

    name: str = Field(..., min_length=1, max_length=255)
    address: str = Field(..., min_length=1)
    lat: float
    lng: float


class BranchUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    address: str | None = Field(default=None, min_length=1)
    lat: float | None = None
    lng: float | None = None


class BranchRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    company_id: str
    name: str
    address: str
    lat: float
    lng: float
    created_at: datetime
