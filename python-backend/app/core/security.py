"""Authentication helpers for requests forwarded by the Supabase gateway."""

from __future__ import annotations

import hmac

from fastapi import Header, status

from app.core.config import get_settings


class ApiContractError(Exception):
    """A safe, client-facing error for the versioned AI contract."""

    def __init__(self, status_code: int, code: str, message: str) -> None:
        self.status_code = status_code
        self.code = code
        self.message = message


def require_ai_backend_token(
    authorization: str | None = Header(default=None),
) -> None:
    """Require the shared bearer token used only by the Edge Function.

    The browser's Supabase session token is validated at the Edge Function. The
    FastAPI service accepts only its server-to-server token, using a constant
    time comparison to avoid token-comparison timing leaks.
    """

    expected_token = get_settings().ai_backend_token

    if not expected_token:
        raise ApiContractError(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "ai_service_not_configured",
            "The AI service is not configured.",
        )

    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise ApiContractError(
            status.HTTP_401_UNAUTHORIZED,
            "unauthorized",
            "Authentication is required.",
        )

    if not hmac.compare_digest(token, expected_token):
        raise ApiContractError(
            status.HTTP_401_UNAUTHORIZED,
            "unauthorized",
            "Authentication is required.",
        )
