"""Company schemalar (v4.1)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CompanyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    logo_url: str | None = Field(default=None, max_length=512)
    billing_day: int = Field(default=1, ge=1, le=28)


class CompanyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    logo_url: str | None = Field(default=None, max_length=512)
    billing_day: int | None = Field(default=None, ge=1, le=28)


class CompanyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str | None
    logo_url: str | None
    billing_day: int
    created_at: datetime
