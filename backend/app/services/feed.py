import json
from pathlib import Path

from app.models.trivia import TriviaItem
from app.repositories import trivia_repo

_FALLBACK_PATH = Path(__file__).resolve().parents[2] / "data" / "fallback.json"
_FEED_SIZE = 10


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
