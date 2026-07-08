"""Umumiy schemalar — pagination va xabar javoblari."""

from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    """Sahifalangan ro'yxat javobi (api.md: limit/offset)."""

    items: list[T]
    total: int
    limit: int
    offset: int


class MessageResponse(BaseModel):
    message: str
