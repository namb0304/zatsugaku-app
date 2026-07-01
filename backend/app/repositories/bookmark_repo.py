from supabase import create_client, ClientOptions

from app.config import settings

_TIMEOUT_SECS = 5
_TRIVIA_COLUMNS = "id, title, summary, genre, tags, source_title, source_url"
_BOOKMARK_SELECT = f"id, trivia_id, created_at, trivia({_TRIVIA_COLUMNS})"


def _client():
    if not settings.SUPABASE_URL or not settings.SUPABASE_SECRET_KEY:
        raise RuntimeError("Supabase credentials not configured")
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SECRET_KEY,
        options=ClientOptions(postgrest_client_timeout=_TIMEOUT_SECS),
    )


def list_bookmarks(user_id: str) -> list[dict]:
    resp = (
        _client()
        .table("bookmarks")
        .select(_BOOKMARK_SELECT)
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return resp.data or []


def add_bookmark(user_id: str, trivia_id: str) -> dict:
    resp = (
        _client()
        .table("bookmarks")
        .upsert(
            {"user_id": user_id, "trivia_id": trivia_id},
            on_conflict="user_id,trivia_id",
        )
        .execute()
    )
    return (resp.data or [{}])[0]


def remove_bookmark(user_id: str, trivia_id: str) -> None:
    _client().table("bookmarks").delete().eq("user_id", user_id).eq(
        "trivia_id", trivia_id
    ).execute()
