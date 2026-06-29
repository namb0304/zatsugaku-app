from supabase import create_client, ClientOptions

from app.config import settings

_TIMEOUT_SECS = 5


def _client():
    if not settings.SUPABASE_URL or not settings.SUPABASE_SECRET_KEY:
        raise RuntimeError("Supabase credentials not configured")
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SECRET_KEY,
        options=ClientOptions(postgrest_client_timeout=_TIMEOUT_SECS),
    )


def record_view(user_id: str, trivia_id: str) -> None:
    # 同じ (user_id, trivia_id) を重複して挿入しない
    _client().table("view_history").upsert(
        {"user_id": user_id, "trivia_id": trivia_id},
        on_conflict="user_id,trivia_id",
    ).execute()
