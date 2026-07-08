"""Telegram bot sozlamalari — .env dan o'qiladi (app'dan mustaqil)."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class BotSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # Token kodda emas — .env (BOT_TOKEN). Bo'sh bo'lsa bot/notifier o'chiq.
    bot_token: str = ""
    # OTP yuboriladigan admin chat ID'lari (vergul bilan): "961047307,1038185913"
    otp_notify_chat_ids: str = ""

    @property
    def chat_ids(self) -> list[int]:
        return [
            int(x.strip())
            for x in self.otp_notify_chat_ids.split(",")
            if x.strip().lstrip("-").isdigit()
        ]

    @property
    def enabled(self) -> bool:
        return bool(self.bot_token and self.chat_ids)


@lru_cache
def get_bot_settings() -> BotSettings:
    return BotSettings()


bot_settings = get_bot_settings()
