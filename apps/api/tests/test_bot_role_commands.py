from types import SimpleNamespace

from app.models.enums import UserRole
from bot.main import _commands_for_role, _profiles_markup


def _command_names(role: UserRole | None, *, multiple: bool = False) -> set[str]:
    return {
        command.command
        for command in _commands_for_role(role, has_multiple_profiles=multiple)
    }


def test_employee_only_sees_employee_commands() -> None:
    commands = _command_names(UserRole.EMPLOYEE, multiple=True)

    assert {
        "start",
        "menu",
        "buyurtmalar",
        "hisobot",
        "rollar",
        "me",
        "unlink",
        "id",
    } == commands
    assert "pending" not in commands


def test_admin_commands_are_scoped_by_role() -> None:
    company_commands = _command_names(UserRole.COMPANY_ADMIN)
    kitchen_commands = _command_names(UserRole.KITCHEN_ADMIN)
    super_commands = _command_names(UserRole.SUPER_ADMIN)

    assert "pending" in company_commands
    assert "hisobot" in company_commands
    assert "menu" not in company_commands
    assert company_commands == kitchen_commands
    assert "pending" in super_commands
    assert "hisobot" not in super_commands
    assert "menu" not in super_commands


def test_role_switch_command_only_appears_for_multiple_profiles() -> None:
    assert "rollar" not in _command_names(UserRole.EMPLOYEE)
    assert "rollar" in _command_names(UserRole.EMPLOYEE, multiple=True)
    assert _command_names(None) == {"start", "id"}


def test_profile_keyboard_marks_the_active_role() -> None:
    profiles = [
        SimpleNamespace(id="employee", role=UserRole.EMPLOYEE),
        SimpleNamespace(id="company", role=UserRole.COMPANY_ADMIN),
    ]

    markup = _profiles_markup(profiles, "company")

    assert markup is not None
    assert markup.inline_keyboard[0][0].text == "🔄 Xodim"
    assert markup.inline_keyboard[1][0].text == "✅ Company Admin"
