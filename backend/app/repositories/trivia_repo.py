from supabase import create_client, ClientOptions

from app.config import settings

_TIMEOUT_SECS = 5
_COLUMNS = "id, title, summary, genre, tags, source_title, source_url"


def fetch_trivia_from_db(limit: int = 10) -> list[dict]:
    if not settings.SUPABASE_URL or not settings.SUPABASE_SECRET_KEY:
        raise RuntimeError("Supabase credentials not configured")

    client = create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SECRET_KEY,
        options=ClientOptions(postgrest_client_timeout=_TIMEOUT_SECS),
    )
    resp = client.table("trivia").select(_COLUMNS).limit(limit).execute()
    return resp.data or []


_INSERT_COLUMNS = ("title", "summary", "genre", "tags", "source_title", "source_url")


def save_trivia_batch(items: list[dict]) -> list[dict]:
    """trivia テーブルへ一括挿入し、DB が付与した id を含む行を返す。"""
    if not settings.SUPABASE_URL or not settings.SUPABASE_SECRET_KEY:
        raise RuntimeError("Supabase credentials not configured")

    rows = [{col: item[col] for col in _INSERT_COLUMNS} for item in items]
    client = create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SECRET_KEY,
        options=ClientOptions(postgrest_client_timeout=_TIMEOUT_SECS),
    )
    resp = client.table("trivia").insert(rows).execute()
    return resp.data or []
