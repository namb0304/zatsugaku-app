"""Supabaseアクセストークン検証依存のテスト。外部通信は行わない。"""
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from app.dependencies import get_current_user_id


def test_auth_rejects_missing_header():
    with pytest.raises(HTTPException) as exc_info:
        get_current_user_id(None)

    assert exc_info.value.status_code == 401


@pytest.mark.parametrize(
    "authorization",
    ["", "Basic abc", "Bearer", "Bearer ", "invalid"],
)
def test_auth_rejects_malformed_header(authorization: str):
    with pytest.raises(HTTPException) as exc_info:
        get_current_user_id(authorization)

    assert exc_info.value.status_code == 401


def test_auth_returns_user_id_from_verified_token():
    auth = MagicMock()
    auth.get_user.return_value = SimpleNamespace(
        user=SimpleNamespace(id="00000000-0000-4000-8000-000000000001")
    )
    supabase = SimpleNamespace(auth=auth)

    with patch("app.dependencies.create_client", return_value=supabase):
        user_id = get_current_user_id("Bearer test-access-token")

    assert user_id == "00000000-0000-4000-8000-000000000001"
    auth.get_user.assert_called_once_with("test-access-token")


def test_auth_hides_supabase_error_details():
    with patch(
        "app.dependencies.create_client",
        side_effect=RuntimeError("secret service error"),
    ):
        with pytest.raises(HTTPException) as exc_info:
            get_current_user_id("Bearer invalid-token")

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Unauthorized"
