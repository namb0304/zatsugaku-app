from fastapi import Header, HTTPException
from supabase import create_client, ClientOptions

from app.config import settings

_TIMEOUT_SECS = 5


def get_optional_user_id(
    authorization: str | None = Header(default=None),
) -> str | None:
    """Authorization が無い場合は None を返す。無効なトークンは 401。"""
    if not authorization:
        return None

    scheme, separator, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not separator or not token.strip():
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = token.strip()

    if not settings.SUPABASE_URL or not settings.SUPABASE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Authentication service not configured")

    try:
        client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SECRET_KEY,
            options=ClientOptions(postgrest_client_timeout=_TIMEOUT_SECS),
        )
        result = client.auth.get_user(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Unauthorized")

    if not result.user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    return str(result.user.id)


def get_current_user_id(authorization: str | None = Header(default=None)) -> str:
    """Authorization: Bearer <token> を検証してユーザーIDを返す。
    トークン検証はSupabase Authに委譲する。
    クライアントから渡されたuser_idは一切使用しない。
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Unauthorized")

    scheme, separator, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not separator or not token.strip():
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = token.strip()

    if not settings.SUPABASE_URL or not settings.SUPABASE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Authentication service not configured")

    try:
        client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SECRET_KEY,
            options=ClientOptions(postgrest_client_timeout=_TIMEOUT_SECS),
        )
        result = client.auth.get_user(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Unauthorized")

    if not result.user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    return str(result.user.id)
