"""Runtime configuration for the FastAPI AI service.

Values are read from environment variables only. This module deliberately does
not log configuration values because they may include shared backend secrets.
"""

from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Settings:
    """Configuration required by versioned, gateway-facing AI endpoints."""

    ai_backend_token: str | None


def get_settings() -> Settings:
    """Load current settings without retaining or displaying secret values."""

    return Settings(ai_backend_token=os.getenv("AI_BACKEND_TOKEN"))
