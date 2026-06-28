import json
from pathlib import Path

from app.models.trivia import TriviaItem
from app.repositories import trivia_repo

_FALLBACK_PATH = Path(__file__).resolve().parents[2] / "data" / "fallback.json"
_FEED_SIZE = 10


def _load_fallback() -> list[TriviaItem]:
    data = json.loads(_FALLBACK_PATH.read_text(encoding="utf-8"))
    return [TriviaItem(**item) for item in data["items"]]


def get_feed() -> list[TriviaItem]:
    try:
        rows = trivia_repo.fetch_trivia_from_db(limit=_FEED_SIZE)
        items = [TriviaItem(**row) for row in rows]
    except Exception:
        return _load_fallback()

    if len(items) < _FEED_SIZE:
        existing_ids = {item.id for item in items}
        for fb_item in _load_fallback():
            if len(items) >= _FEED_SIZE:
                break
            if fb_item.id not in existing_ids:
                items.append(fb_item)
                existing_ids.add(fb_item.id)

    return items
