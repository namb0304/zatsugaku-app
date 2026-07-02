import json
from pathlib import Path

from app.models.trivia import TriviaItem
from app.repositories import bookmark_repo, preferences_repo, trivia_repo, view_history_repo
from app.services.personalization import score_items

_FALLBACK_PATH = Path(__file__).resolve().parents[2] / "data" / "fallback.json"
_FEED_SIZE = 10
_PERSONALIZED_POOL_SIZE = 100


def _load_fallback() -> list[TriviaItem]:
    data = json.loads(_FALLBACK_PATH.read_text(encoding="utf-8"))
    return [TriviaItem(**item) for item in data["items"]]


def _to_db_dict(item: TriviaItem) -> dict:
    """TriviaItem を DB upsert 用 dict に変換する。"""
    return {
        "id": str(item.id),
        "title": item.title,
        "summary": item.summary,
        "genre": item.genre,
        "tags": item.tags,
        "source_title": item.source_title,
        "source_url": str(item.source_url),
    }


def get_feed() -> list[TriviaItem]:
    try:
        rows = trivia_repo.fetch_trivia_from_db(limit=_FEED_SIZE)
        items = [TriviaItem(**row) for row in rows]
    except Exception:
        # DB 完全障害 → ゲスト閲覧を維持するため fallback をそのまま返す
        # DB が落ちている場合、bookmark/view-history も同様に失敗するため許容する
        return _load_fallback()

    if len(items) < _FEED_SIZE:
        existing_ids = {item.id for item in items}
        fallback_added: list[TriviaItem] = []
        for fb_item in _load_fallback():
            if len(items) >= _FEED_SIZE:
                break
            if fb_item.id not in existing_ids:
                items.append(fb_item)
                existing_ids.add(fb_item.id)
                fallback_added.append(fb_item)

        if fallback_added:
            try:
                # fallback 雑学を trivia テーブルに保存し外部キー制約を成立させる
                # これにより fallback 雑学に対しても bookmark/view-history が保存可能になる
                trivia_repo.upsert_fallback_batch([_to_db_dict(fb) for fb in fallback_added])
            except Exception:
                # upsert 失敗はゲスト閲覧を壊さない
                # DB 障害時はログインユーザーの bookmark も失敗するが許容する
                pass

    return items


def get_personalized_feed(user_id: str) -> list[TriviaItem]:
    """ログインユーザー向けにスコアリングしたフィードを返す。
    各ユーザーデータの取得失敗は個別に許容し、ゲスト相当の値で継続する。
    """
    preferred_genres, bookmark_genres, bookmark_tags = get_user_signals(user_id)

    try:
        viewed_ids = set(view_history_repo.get_view_history(user_id))
    except Exception:
        viewed_ids = set()

    try:
        rows = trivia_repo.fetch_trivia_from_db(limit=_PERSONALIZED_POOL_SIZE)
        items = [TriviaItem(**row) for row in rows]
    except Exception:
        return _load_fallback()

    if len(items) < _FEED_SIZE:
        existing_ids = {item.id for item in items}
        fallback_added: list[TriviaItem] = []
        for fb_item in _load_fallback():
            if len(items) >= _FEED_SIZE:
                break
            if fb_item.id not in existing_ids:
                items.append(fb_item)
                existing_ids.add(fb_item.id)
                fallback_added.append(fb_item)

        if fallback_added:
            try:
                trivia_repo.upsert_fallback_batch([_to_db_dict(fb) for fb in fallback_added])
            except Exception:
                pass

    scored = score_items(
        items,
        preferred_genres,
        bookmark_genres,
        bookmark_tags,
        viewed_ids,
    )
    if not scored and items:
        # 現在の候補をすべて見終えた場合だけ再循環し、空フィードを避ける。
        scored = score_items(
            items,
            preferred_genres,
            bookmark_genres,
            bookmark_tags,
            set(),
        )
    return scored[:_FEED_SIZE]


def get_user_signals(user_id: str) -> tuple[list[str], list[str], list[str]]:
    """ユーザーの選択ジャンルとブックマーク由来シグナルを取得する。"""
    try:
        preferred_genres = preferences_repo.get_preferences(user_id)
    except Exception:
        preferred_genres = []

    bookmark_genres: list[str] = []
    bookmark_tags: list[str] = []
    try:
        bookmarks = bookmark_repo.list_bookmarks(user_id)
        for bookmark in bookmarks:
            trivia = bookmark.get("trivia")
            if not trivia:
                continue
            genre = trivia.get("genre")
            if genre:
                bookmark_genres.append(genre)
            bookmark_tags.extend(trivia.get("tags") or [])
    except Exception:
        pass

    return preferred_genres, bookmark_genres, bookmark_tags
