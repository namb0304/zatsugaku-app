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
# fallback upsert では id も明示的に保存する
_UPSERT_FALLBACK_COLUMNS = ("id",) + _INSERT_COLUMNS


def upsert_fallback_batch(items: list[dict]) -> None:
    """fallback 雑学を id 指定で trivia テーブルへ upsert する。
    ID が既に存在する場合は更新しない。
    ブックマーク・視聴履歴の外部キー制約を成立させる目的で呼ぶ。
    """
    if not items:
        return
    if not settings.SUPABASE_URL or not settings.SUPABASE_SECRET_KEY:
        raise RuntimeError("Supabase credentials not configured")

    rows = [{col: item[col] for col in _UPSERT_FALLBACK_COLUMNS} for item in items]
    client = create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SECRET_KEY,
        options=ClientOptions(postgrest_client_timeout=_TIMEOUT_SECS),
    )
    client.table("trivia").upsert(rows, on_conflict="id").execute()


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
