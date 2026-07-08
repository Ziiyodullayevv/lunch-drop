"""Meal / menu category / menu schedule schemalar (Kitchen Admin)."""

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, computed_field, model_validator


class MenuCategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class MenuCategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    kitchen_id: str
    name: str


class MealCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    price: Decimal = Field(..., gt=0, max_digits=10, decimal_places=2)
    image_url: str | None = Field(default=None, max_length=512)
    category_id: str | None = None


class MealUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    price: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    image_url: str | None = Field(default=None, max_length=512)
    category_id: str | None = None


class MealRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    kitchen_id: str
    category_id: str | None
    name: str
    description: str | None
    price: Decimal
    image_url: str | None
    created_at: datetime


class ScheduleMenuRequest(BaseModel):
    """Taomni hafta kuniga (day_of_week 1-7) YOKI aniq sanaga (specific_date) qo'yish."""

    meal_id: str
    day_of_week: int | None = Field(default=None, ge=1, le=7)
    specific_date: date | None = None

    @model_validator(mode="after")
    def _exactly_one(self) -> "ScheduleMenuRequest":
        if (self.day_of_week is None) == (self.specific_date is None):
            raise ValueError("day_of_week yoki specific_date dan faqat bittasi berilsin")
        return self


class MenuScheduleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    meal_id: str
    day_of_week: int | None
    specific_date: date | None

    @computed_field
    @property
    def effective_day_of_week(self) -> int | None:
        """Hafta kuni (Du=1 … Yak=7). day_of_week bo'lmasa specific_date'dan olinadi.

        Frontend shu maydon orqali kunlarni har hafta ko'rsatadi (specific_date bo'lsa ham).
        """
        if self.day_of_week is not None:
            return self.day_of_week
        if self.specific_date is not None:
            return self.specific_date.isoweekday()
        return None
