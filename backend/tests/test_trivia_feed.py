from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.models.trivia import ALLOWED_GENRES

client = TestClient(app)

_DB_ROWS = [
    {
        "id": f"a0000000-0000-0000-0000-{i:012d}",
        "title": f"タイトル{i}",
        "summary": f"概要{i}",
        "genre": "自然・科学・宇宙",
        "tags": ["タグ1", "タグ2"],
        "source_title": "Wikipedia",
        "source_url": f"https://ja.wikipedia.org/wiki/test{i}",
    }
    for i in range(10)
]


def test_feed_returns_200_with_items():
    with patch("app.repositories.trivia_repo.fetch_trivia_from_db", return_value=_DB_ROWS):
        response = client.get("/trivia/feed")
    assert response.status_code == 200
    assert len(response.json()["items"]) == 10


def test_feed_returns_required_fields():
    with patch("app.repositories.trivia_repo.fetch_trivia_from_db", return_value=_DB_ROWS):
        response = client.get("/trivia/feed")
    item = response.json()["items"][0]
    for field in ("id", "title", "summary", "genre", "tags", "source_title", "source_url"):
        assert field in item, f"フィールド '{field}' が欠けています"


def test_feed_falls_back_on_db_error():
    with patch("app.repositories.trivia_repo.fetch_trivia_from_db", side_effect=Exception("connection error")):
        response = client.get("/trivia/feed")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 10


def test_feed_supplements_with_fallback_when_db_is_short():
    with patch("app.repositories.trivia_repo.fetch_trivia_from_db", return_value=_DB_ROWS[:3]):
        response = client.get("/trivia/feed")
    data = response.json()
    assert len(data["items"]) == 10
    ids = [item["id"] for item in data["items"]]
    assert len(ids) == len(set(ids)), "ID が重複しています"


def test_feed_returns_fallback_when_db_is_empty():
    with patch("app.repositories.trivia_repo.fetch_trivia_from_db", return_value=[]):
        response = client.get("/trivia/feed")
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 10
    assert len({item["id"] for item in items}) == 10
    assert {item["genre"] for item in items} == ALLOWED_GENRES
    assert all(1 <= len(item["title"]) <= 30 for item in items)
    assert all(1 <= len(item["summary"]) <= 300 for item in items)
    assert all(2 <= len(item["tags"]) <= 4 for item in items)
    assert all(item["source_url"].startswith(("http://", "https://")) for item in items)


def test_feed_skips_fallback_id_already_returned_by_db():
    colliding_row = {
        **_DB_ROWS[0],
        "id": "fb000000-0000-0000-0000-000000000001",
    }
    with patch(
        "app.repositories.trivia_repo.fetch_trivia_from_db",
        return_value=[colliding_row],
    ):
        response = client.get("/trivia/feed")
    ids = [item["id"] for item in response.json()["items"]]
    assert len(ids) == 10
    assert len(ids) == len(set(ids))
