from app.api.v1.super_admin import router
from app.models.enums import OrderStatus
from app.schemas.order import OrderStatusUpdate


def test_super_admin_order_status_route_is_registered() -> None:
    route = next(
        route
        for route in router.routes
        if route.path == "/api/v1/super-admin/orders/{order_id}/status"
    )

    assert "PATCH" in route.methods


def test_delivered_status_payload_is_valid() -> None:
    assert OrderStatusUpdate(status="delivered").status == OrderStatus.DELIVERED
