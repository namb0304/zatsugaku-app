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


def get_preferences(user_id: str) -> list[str]:
    resp = (
        _client()
        .table("user_preferences")
        .select("genre")
        .eq("user_id", user_id)
        .order("created_at")
        .execute()
    )
    return [row["genre"] for row in (resp.data or [])]


def set_preferences(user_id: str, genres: list[str]) -> list[str]:
    client = _client()
    if genres:
        rows = [{"user_id": user_id, "genre": genre} for genre in genres]
        client.table("user_preferences").upsert(
            rows,
            on_conflict="user_id,genre",
        ).execute()
        (
            client.table("user_preferences")
            .delete()
            .eq("user_id", user_id)
            .not_.in_("genre", genres)
            .execute()
        )
    else:
        client.table("user_preferences").delete().eq("user_id", user_id).execute()
    return genres
