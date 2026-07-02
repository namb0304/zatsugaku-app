from types import SimpleNamespace
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


# ── 認証・パーソナライズ ────────────────────────────────────────────────────────


def _auth_supabase(user_id: str = "user-123"):
    """有効なトークンを返すモック Supabase クライアントを作る。"""
    auth = MagicMock()
    auth.get_user.return_value = SimpleNamespace(
        user=SimpleNamespace(id=user_id)
    )
    return SimpleNamespace(auth=auth)


def test_feed_returns_401_on_invalid_token():
    """無効な Bearer トークンはゲスト扱いにせず 401 を返す。"""
    with patch(
        "app.dependencies.create_client",
        side_effect=RuntimeError("Supabase error"),
    ):
        response = client.get(
            "/trivia/feed",
            headers={"Authorization": "Bearer invalid-token"},
        )

    assert response.status_code == 401


def test_feed_returns_401_on_malformed_auth_header():
    """Bearer 以外のスキームは 401。"""
    response = client.get(
        "/trivia/feed",
        headers={"Authorization": "Basic some-token"},
    )
    assert response.status_code == 401


def test_feed_returns_personalized_feed_when_logged_in():
    """ログイン中はパーソナライズされたフィードを返す（選択ジャンルが先頭）。"""
    history_row = {
        **_DB_ROWS[0],
        "id": "aa000000-0000-4000-8000-000000000099",
        "genre": "歴史・偉人",
    }
    rows = [history_row] + _DB_ROWS[1:]  # 歴史 row を先頭以外に配置（DB順はスコア無視）

    with (
        patch("app.dependencies.create_client", return_value=_auth_supabase()),
        patch("app.repositories.preferences_repo.get_preferences", return_value=["歴史・偉人"]),
        patch("app.repositories.bookmark_repo.list_bookmarks", return_value=[]),
        patch("app.repositories.view_history_repo.get_view_history", return_value=[]),
        patch("app.repositories.trivia_repo.fetch_trivia_from_db", return_value=rows),
    ):
        response = client.get(
            "/trivia/feed",
            headers={"Authorization": "Bearer valid-token"},
        )

    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 10
    # 選択ジャンル +3 で歴史 row が先頭に来る
    assert items[0]["id"] == "aa000000-0000-4000-8000-000000000099"


def test_feed_personalized_viewed_items_are_excluded():
    """視聴済み雑学はスコアに関係なく候補から除外される。"""
    history_row = {
        **_DB_ROWS[0],
        "id": "aa000000-0000-4000-8000-000000000099",
        "genre": "歴史・偉人",
    }
    rows = [history_row] + _DB_ROWS[1:]

    with (
        patch("app.dependencies.create_client", return_value=_auth_supabase()),
        patch("app.repositories.preferences_repo.get_preferences", return_value=["歴史・偉人"]),
        patch("app.repositories.bookmark_repo.list_bookmarks", return_value=[]),
        # history_row は視聴済み
        patch(
            "app.repositories.view_history_repo.get_view_history",
            return_value=["aa000000-0000-4000-8000-000000000099"],
        ),
        patch("app.repositories.trivia_repo.fetch_trivia_from_db", return_value=rows),
    ):
        response = client.get(
            "/trivia/feed",
            headers={"Authorization": "Bearer valid-token"},
        )

    items = response.json()["items"]
    ids = [item["id"] for item in items]
    assert "aa000000-0000-4000-8000-000000000099" not in ids


def test_feed_personalized_recycles_after_all_candidates_are_viewed():
    """全候補を視聴済みでも空にせず、次の周回として10件返す。"""
    viewed_ids = [row["id"] for row in _DB_ROWS]

    with (
        patch("app.dependencies.create_client", return_value=_auth_supabase()),
        patch("app.repositories.preferences_repo.get_preferences", return_value=[]),
        patch("app.repositories.bookmark_repo.list_bookmarks", return_value=[]),
        patch(
            "app.repositories.view_history_repo.get_view_history",
            return_value=viewed_ids,
        ),
        patch(
            "app.repositories.trivia_repo.fetch_trivia_from_db",
            return_value=_DB_ROWS,
        ),
    ):
        response = client.get(
            "/trivia/feed",
            headers={"Authorization": "Bearer valid-token"},
        )

    assert response.status_code == 200
    assert len(response.json()["items"]) == 10


def test_feed_personalized_partial_data_failure_still_returns_feed():
    """preferences 取得が失敗しても残りのデータでフィードを返す。"""
    with (
        patch("app.dependencies.create_client", return_value=_auth_supabase()),
        patch(
            "app.repositories.preferences_repo.get_preferences",
            side_effect=RuntimeError("DB timeout"),
        ),
        patch("app.repositories.bookmark_repo.list_bookmarks", return_value=[]),
        patch("app.repositories.view_history_repo.get_view_history", return_value=[]),
        patch("app.repositories.trivia_repo.fetch_trivia_from_db", return_value=_DB_ROWS),
    ):
        response = client.get(
            "/trivia/feed",
            headers={"Authorization": "Bearer valid-token"},
        )

    assert response.status_code == 200
    assert len(response.json()["items"]) == 10
