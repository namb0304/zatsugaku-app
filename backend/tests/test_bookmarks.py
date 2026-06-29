"""GET/POST/DELETE /bookmarks のテスト。Supabase は常にモックする。"""
from unittest.mock import patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.dependencies import get_current_user_id
from app.main import app

TEST_USER_ID = "00000000-0000-4000-8000-000000000001"
TEST_TRIVIA_ID = "00000000-0000-4000-8000-000000000002"

client = TestClient(app)


@pytest.fixture(autouse=True)
def authenticated_user():
    app.dependency_overrides[get_current_user_id] = lambda: TEST_USER_ID
    yield
    app.dependency_overrides.pop(get_current_user_id, None)

_BOOKMARK_ROWS = [
    {
        "id": "00000000-0000-4000-8000-000000000003",
        "trivia_id": TEST_TRIVIA_ID,
        "trivia": {
            "id": TEST_TRIVIA_ID,
            "title": "テストタイトル",
            "summary": "テスト概要",
            "genre": "自然・科学・宇宙",
            "source_title": "Wikipedia",
            "source_url": "https://ja.wikipedia.org/wiki/test",
        },
        "created_at": "2024-01-01T00:00:00+00:00",
    }
]

_BOOKMARK_CREATE_ROW = {
    "id": "00000000-0000-4000-8000-000000000004",
    "trivia_id": TEST_TRIVIA_ID,
    "created_at": "2024-01-01T00:00:00+00:00",
}


# ── GET /bookmarks ────────────────────────────────────────────────────────────


def test_list_bookmarks_returns_200_with_items():
    with patch("app.repositories.bookmark_repo.list_bookmarks", return_value=_BOOKMARK_ROWS):
        res = client.get("/bookmarks")
    assert res.status_code == 200
    data = res.json()
    assert len(data["items"]) == 1
    item = data["items"][0]
    assert item["trivia"]["title"] == "テストタイトル"
    assert item["trivia"]["id"] == TEST_TRIVIA_ID


def test_list_bookmarks_returns_empty_list_when_no_bookmarks():
    with patch("app.repositories.bookmark_repo.list_bookmarks", return_value=[]):
        res = client.get("/bookmarks")
    assert res.status_code == 200
    assert res.json()["items"] == []


def test_list_bookmarks_requires_auth():
    original = app.dependency_overrides[get_current_user_id]
    app.dependency_overrides[get_current_user_id] = lambda: (_ for _ in ()).throw(
        HTTPException(status_code=401, detail="Unauthorized")
    )
    try:
        res = client.get("/bookmarks")
        assert res.status_code == 401
    finally:
        app.dependency_overrides[get_current_user_id] = original


# ── POST /bookmarks ───────────────────────────────────────────────────────────


def test_create_bookmark_returns_201():
    with patch(
        "app.repositories.bookmark_repo.add_bookmark", return_value=_BOOKMARK_CREATE_ROW
    ):
        res = client.post("/bookmarks", json={"trivia_id": TEST_TRIVIA_ID})
    assert res.status_code == 201
    assert res.json()["trivia_id"] == TEST_TRIVIA_ID


def test_create_bookmark_requires_auth():
    original = app.dependency_overrides[get_current_user_id]
    app.dependency_overrides[get_current_user_id] = lambda: (_ for _ in ()).throw(
        HTTPException(status_code=401, detail="Unauthorized")
    )
    try:
        res = client.post("/bookmarks", json={"trivia_id": TEST_TRIVIA_ID})
        assert res.status_code == 401
    finally:
        app.dependency_overrides[get_current_user_id] = original


def test_create_bookmark_calls_repo_with_correct_user_id():
    with patch(
        "app.repositories.bookmark_repo.add_bookmark", return_value=_BOOKMARK_CREATE_ROW
    ) as mock_add:
        client.post("/bookmarks", json={"trivia_id": TEST_TRIVIA_ID})
    mock_add.assert_called_once_with(TEST_USER_ID, TEST_TRIVIA_ID)


def test_create_bookmark_rejects_invalid_uuid():
    with patch("app.repositories.bookmark_repo.add_bookmark") as mock_add:
        res = client.post("/bookmarks", json={"trivia_id": "not-a-uuid"})

    assert res.status_code == 422
    mock_add.assert_not_called()


# ── DELETE /bookmarks/{trivia_id} ─────────────────────────────────────────────


def test_delete_bookmark_returns_204():
    with patch("app.repositories.bookmark_repo.remove_bookmark") as mock_rm:
        res = client.delete(f"/bookmarks/{TEST_TRIVIA_ID}")
    assert res.status_code == 204
    mock_rm.assert_called_once_with(TEST_USER_ID, TEST_TRIVIA_ID)


def test_delete_bookmark_requires_auth():
    original = app.dependency_overrides[get_current_user_id]
    app.dependency_overrides[get_current_user_id] = lambda: (_ for _ in ()).throw(
        HTTPException(status_code=401, detail="Unauthorized")
    )
    try:
        res = client.delete(f"/bookmarks/{TEST_TRIVIA_ID}")
        assert res.status_code == 401
    finally:
        app.dependency_overrides[get_current_user_id] = original
