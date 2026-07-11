"""Employee schemalar — onboarding, menyu, buyurtma."""

from datetime import date, datetime, time
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import AccountStatus, OrderStatus


class BranchPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    address: str
    lat: float
    lng: float


class CompanyPublic(BaseModel):
    """Xodim tanlashi uchun kompaniya + filiallari."""

    id: str
    name: str
    branches: list[BranchPublic]


class JoinBranchRequest(BaseModel):
    """Xodim bir nechta filialga a'zo bo'lishi mumkin (bitta kompaniya doirasida)."""

    branch_ids: list[str] = Field(..., min_length=1)


class EmployeeProfileUpdate(BaseModel):
    """Xodim o'z profilini yangilaydi. Telefon (login identifikatori) bu yerda emas."""

    name: str | None = Field(default=None, min_length=1, max_length=255)


class EmployeeStatusRead(BaseModel):
    account_status: AccountStatus | None
    company_id: str | None
    branches: list[BranchPublic] = Field(default_factory=list)
    kitchen_names: list[str] = Field(default_factory=list)


class MenuMealRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    kitchen_id: str
    category_id: str | None
    name: str
    description: str | None
    price: Decimal
    image_url: str | None
    # Oshxona ma'lumotlari (frontend: nom + yetkazish oynasi "11:30 - 13:00")
    kitchen_name: str | None = None
    order_cutoff_time: time | None = None
    delivery_start_time: time | None = None  # "11:30:00" formatida JSON'da
    delivery_end_time: time | None = None


class MenuResponse(BaseModel):
    target_date: date
    items: list[MenuMealRead]


class OrderItemCreate(BaseModel):
    meal_id: str
    quantity: int = Field(default=1, ge=1, le=20)


class OrderCreate(BaseModel):
    branch_id: str  # bugun qaysi filialdasiz — ovqat shu yerga yetkaziladi
    kitchen_id: str
    items: list[OrderItemCreate] = Field(default_factory=list, max_length=20)
    meal_id: str | None = None  # eski clientlar uchun vaqtinchalik moslik
    target_date: date

    @model_validator(mode="after")
    def require_items(self):
        if not self.items and not self.meal_id:
            raise ValueError("Kamida bitta taom tanlanishi kerak")
        if not self.items and self.meal_id:
            self.items = [OrderItemCreate(meal_id=self.meal_id)]
        return self


class OrderHistoryMealItem(BaseModel):
    meal_id: str
    meal_name: str
    meal_image_url: str | None
    quantity: int
    historical_price: Decimal


class OrderHistoryItem(BaseModel):
    """Xodimning buyurtmasi — taom va oshxona ma'lumotlari bilan boyitilgan."""

    id: str
    target_date: date
    status: OrderStatus
    status_label: str  # o'zbekcha: Qabul qilindi / Tayyorlanmoqda / Yo'lda / Yetkazildi
    historical_price: Decimal
    system_fee: Decimal
    meal_id: str
    meal_name: str
    meal_image_url: str | None
    kitchen_id: str
    kitchen_name: str
    branch_id: str
    branch_name: str
    created_at: datetime
    items: list[OrderHistoryMealItem] = Field(default_factory=list)
