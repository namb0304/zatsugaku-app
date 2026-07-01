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


def get_view_history(user_id: str) -> list[str]:
    """ユーザーの視聴済み trivia_id リストを返す。"""
    resp = (
        _client()
        .table("view_history")
        .select("trivia_id")
        .eq("user_id", user_id)
        .execute()
    )
    return [row["trivia_id"] for row in (resp.data or [])]


def record_view(user_id: str, trivia_id: str) -> None:
    # 同じ (user_id, trivia_id) を重複して挿入しない
    _client().table("view_history").upsert(
        {"user_id": user_id, "trivia_id": trivia_id},
        on_conflict="user_id,trivia_id",
    ).execute()
