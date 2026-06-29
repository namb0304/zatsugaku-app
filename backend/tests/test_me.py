"""GET/PUT /me/preferences と POST /me/view-history のテスト。Supabase は常にモックする。"""
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

_SAVED_GENRES = ["自然・科学・宇宙", "生き物"]


# ── GET /me/preferences ────────────────────────────────────────────────────────


def test_get_preferences_returns_genres():
    with patch("app.repositories.preferences_repo.get_preferences", return_value=_SAVED_GENRES):
        res = client.get("/me/preferences")
    assert res.status_code == 200
    assert res.json()["genres"] == _SAVED_GENRES


def test_get_preferences_returns_empty_when_not_set():
    with patch("app.repositories.preferences_repo.get_preferences", return_value=[]):
        res = client.get("/me/preferences")
    assert res.status_code == 200
    assert res.json()["genres"] == []


def test_get_preferences_requires_auth():
    original = app.dependency_overrides[get_current_user_id]
    app.dependency_overrides[get_current_user_id] = lambda: (_ for _ in ()).throw(
        HTTPException(status_code=401, detail="Unauthorized")
    )
    try:
        res = client.get("/me/preferences")
        assert res.status_code == 401
    finally:
        app.dependency_overrides[get_current_user_id] = original


# ── PUT /me/preferences ────────────────────────────────────────────────────────


def test_update_preferences_saves_and_returns_genres():
    with patch(
        "app.repositories.preferences_repo.set_preferences", return_value=_SAVED_GENRES
    ) as mock_set:
        res = client.put("/me/preferences", json={"genres": _SAVED_GENRES})
    assert res.status_code == 200
    assert res.json()["genres"] == _SAVED_GENRES
    mock_set.assert_called_once_with(TEST_USER_ID, _SAVED_GENRES)


def test_update_preferences_rejects_invalid_genres():
    """許可ジャンル以外が含まれるリクエストは保存しない。"""
    with patch("app.repositories.preferences_repo.set_preferences") as mock_set:
        res = client.put(
            "/me/preferences", json={"genres": ["自然・科学・宇宙", "存在しないジャンル"]}
        )
    assert res.status_code == 422
    mock_set.assert_not_called()


def test_update_preferences_requires_auth():
    original = app.dependency_overrides[get_current_user_id]
    app.dependency_overrides[get_current_user_id] = lambda: (_ for _ in ()).throw(
        HTTPException(status_code=401, detail="Unauthorized")
    )
    try:
        res = client.put("/me/preferences", json={"genres": _SAVED_GENRES})
        assert res.status_code == 401
    finally:
        app.dependency_overrides[get_current_user_id] = original


# ── POST /me/view-history ──────────────────────────────────────────────────────


def test_record_view_history_returns_201():
    with patch("app.repositories.view_history_repo.record_view") as mock_rv:
        res = client.post("/me/view-history", json={"trivia_id": TEST_TRIVIA_ID})
    assert res.status_code == 201
    mock_rv.assert_called_once_with(TEST_USER_ID, TEST_TRIVIA_ID)


def test_record_view_history_requires_auth():
    original = app.dependency_overrides[get_current_user_id]
    app.dependency_overrides[get_current_user_id] = lambda: (_ for _ in ()).throw(
        HTTPException(status_code=401, detail="Unauthorized")
    )
    try:
        res = client.post("/me/view-history", json={"trivia_id": TEST_TRIVIA_ID})
        assert res.status_code == 401
    finally:
        app.dependency_overrides[get_current_user_id] = original
