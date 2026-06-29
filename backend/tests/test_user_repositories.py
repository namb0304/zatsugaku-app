"""ユーザーデータ用Repositoryのuser_id条件と既存DBスキーマを確認する。"""
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from app.repositories import bookmark_repo, preferences_repo, view_history_repo

USER_ID = "00000000-0000-4000-8000-000000000001"
TRIVIA_ID = "00000000-0000-4000-8000-000000000002"


def _query(data=None) -> MagicMock:
    query = MagicMock()
    query.select.return_value = query
    query.eq.return_value = query
    query.order.return_value = query
    query.upsert.return_value = query
    query.delete.return_value = query
    query.in_.return_value = query
    query.not_ = query
    query.execute.return_value = SimpleNamespace(data=data or [])
    return query


def test_list_bookmarks_filters_by_user_id():
    query = _query()
    client = MagicMock()
    client.table.return_value = query

    with patch("app.repositories.bookmark_repo._client", return_value=client):
        bookmark_repo.list_bookmarks(USER_ID)

    query.eq.assert_called_once_with("user_id", USER_ID)


def test_remove_bookmark_filters_by_user_and_trivia():
    query = _query()
    client = MagicMock()
    client.table.return_value = query

    with patch("app.repositories.bookmark_repo._client", return_value=client):
        bookmark_repo.remove_bookmark(USER_ID, TRIVIA_ID)

    assert query.eq.call_args_list[0].args == ("user_id", USER_ID)
    assert query.eq.call_args_list[1].args == ("trivia_id", TRIVIA_ID)


def test_preferences_read_existing_genre_rows_for_user():
    query = _query([{"genre": "生き物"}, {"genre": "歴史・偉人"}])
    client = MagicMock()
    client.table.return_value = query

    with patch("app.repositories.preferences_repo._client", return_value=client):
        genres = preferences_repo.get_preferences(USER_ID)

    query.select.assert_called_once_with("genre")
    query.eq.assert_called_once_with("user_id", USER_ID)
    assert genres == ["生き物", "歴史・偉人"]


def test_preferences_write_one_row_per_genre_and_remove_stale_rows():
    query = _query()
    client = MagicMock()
    client.table.return_value = query
    genres = ["生き物", "歴史・偉人"]

    with patch("app.repositories.preferences_repo._client", return_value=client):
        preferences_repo.set_preferences(USER_ID, genres)

    query.upsert.assert_called_once_with(
        [
            {"user_id": USER_ID, "genre": "生き物"},
            {"user_id": USER_ID, "genre": "歴史・偉人"},
        ],
        on_conflict="user_id,genre",
    )
    query.in_.assert_called_once_with("genre", genres)
    assert ("user_id", USER_ID) in [call.args for call in query.eq.call_args_list]


def test_view_history_upsert_uses_authenticated_user_id():
    query = _query()
    client = MagicMock()
    client.table.return_value = query

    with patch("app.repositories.view_history_repo._client", return_value=client):
        view_history_repo.record_view(USER_ID, TRIVIA_ID)

    query.upsert.assert_called_once_with(
        {"user_id": USER_ID, "trivia_id": TRIVIA_ID},
        on_conflict="user_id,trivia_id",
    )
