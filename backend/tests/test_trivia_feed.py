from unittest.mock import MagicMock, call, patch

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

# upsert が呼ばれないことを検証したいテストで使う "no-op" パッチ
_NO_UPSERT = patch("app.repositories.trivia_repo.upsert_fallback_batch")


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
    """DB が完全に落ちたときは fallback を返す。upsert は呼ばない。"""
    with (
        patch(
            "app.repositories.trivia_repo.fetch_trivia_from_db",
            side_effect=Exception("connection error"),
        ),
        patch("app.repositories.trivia_repo.upsert_fallback_batch") as mock_upsert,
    ):
        response = client.get("/trivia/feed")
    assert response.status_code == 200
    assert len(response.json()["items"]) == 10
    # DB が落ちている場合、upsert も試みない
    mock_upsert.assert_not_called()


def test_feed_supplements_with_fallback_when_db_is_short():
    """DB が 3 件のとき fallback で 10 件に補完し、upsert する。"""
    with (
        patch(
            "app.repositories.trivia_repo.fetch_trivia_from_db", return_value=_DB_ROWS[:3]
        ),
        patch("app.repositories.trivia_repo.upsert_fallback_batch") as mock_upsert,
    ):
        response = client.get("/trivia/feed")

    data = response.json()
    assert len(data["items"]) == 10
    ids = [item["id"] for item in data["items"]]
    assert len(ids) == len(set(ids)), "ID が重複しています"
    # fallback 7 件分の upsert が呼ばれる
    mock_upsert.assert_called_once()
    upserted = mock_upsert.call_args.args[0]
    assert len(upserted) == 7


def test_feed_returns_fallback_when_db_is_empty():
    """DB が 0 件のとき fallback 全 10 件を upsert して返す。"""
    with (
        patch(
            "app.repositories.trivia_repo.fetch_trivia_from_db", return_value=[]
        ),
        patch("app.repositories.trivia_repo.upsert_fallback_batch") as mock_upsert,
    ):
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
    # 全 10 件を upsert
    mock_upsert.assert_called_once()
    assert len(mock_upsert.call_args.args[0]) == 10


def test_feed_skips_fallback_id_already_returned_by_db():
    """DB 返却済みの fallback ID は upsert しない。"""
    colliding_row = {
        **_DB_ROWS[0],
        "id": "fb000000-0000-0000-0000-000000000001",
    }
    with (
        patch(
            "app.repositories.trivia_repo.fetch_trivia_from_db",
            return_value=[colliding_row],
        ),
        patch("app.repositories.trivia_repo.upsert_fallback_batch") as mock_upsert,
    ):
        response = client.get("/trivia/feed")

    ids = [item["id"] for item in response.json()["items"]]
    assert len(ids) == 10
    assert len(ids) == len(set(ids))
    # fb000000-...-000001 は DB から返ったので upsert 対象外
    upserted_ids = {row["id"] for row in mock_upsert.call_args.args[0]}
    assert "fb000000-0000-0000-0000-000000000001" not in upserted_ids


# ── 回帰テスト ─────────────────────────────────────────────────────────────────


def test_feed_upserted_ids_include_all_fallback_supplements():
    """upsert に渡される dict が返却 items の fallback ID と一致する。"""
    with (
        patch(
            "app.repositories.trivia_repo.fetch_trivia_from_db", return_value=_DB_ROWS[:1]
        ),
        patch("app.repositories.trivia_repo.upsert_fallback_batch") as mock_upsert,
    ):
        response = client.get("/trivia/feed")

    returned_ids = {item["id"] for item in response.json()["items"]}
    db_id = _DB_ROWS[0]["id"]
    fallback_returned_ids = returned_ids - {db_id}
    upserted_ids = {row["id"] for row in mock_upsert.call_args.args[0]}
    # 返却された fallback ID と upsert された ID が一致する
    assert fallback_returned_ids == upserted_ids


def test_feed_upserted_dicts_have_only_allowed_columns():
    """upsert に渡す dict は id + 5 列のみ含む。"""
    with (
        patch("app.repositories.trivia_repo.fetch_trivia_from_db", return_value=[]),
        patch("app.repositories.trivia_repo.upsert_fallback_batch") as mock_upsert,
    ):
        client.get("/trivia/feed")

    allowed = {"id", "title", "summary", "genre", "tags", "source_title", "source_url"}
    for row in mock_upsert.call_args.args[0]:
        assert set(row.keys()) == allowed, f"不正な列: {set(row.keys()) - allowed}"


def test_feed_still_returns_items_if_upsert_fails():
    """upsert が失敗してもゲスト閲覧用のフィードを返す。"""
    with (
        patch("app.repositories.trivia_repo.fetch_trivia_from_db", return_value=[]),
        patch(
            "app.repositories.trivia_repo.upsert_fallback_batch",
            side_effect=RuntimeError("DB unavailable"),
        ),
    ):
        response = client.get("/trivia/feed")

    assert response.status_code == 200
    assert len(response.json()["items"]) == 10


def test_feed_does_not_upsert_when_db_is_full():
    """DB から 10 件取得できた場合は upsert を呼ばない。"""
    with (
        patch("app.repositories.trivia_repo.fetch_trivia_from_db", return_value=_DB_ROWS),
        patch("app.repositories.trivia_repo.upsert_fallback_batch") as mock_upsert,
    ):
        client.get("/trivia/feed")

    mock_upsert.assert_not_called()
