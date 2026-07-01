"""POST /trivia/generate のテスト。Supabase と Gemini は常にモックする。"""
import json
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient
from google.genai import types
import pytest

from app.main import app
from app.models.gemini import GeminiResponse
from app.repositories import trivia_repo
from app.services import gemini_service
from app.services.gemini_service import GeminiGenerationError

client = TestClient(app)

# Gemini が返す想定の生成結果（10 件）
_GEMINI_ITEMS = [
    {
        "title": f"生成タイトル{i}",
        "summary": f"生成された概要{i}。" * 5,
        "genre": "自然・科学・宇宙",
        "tags": ["タグA", "タグB"],
        "source_title": "Wikipedia",
        "source_url": f"https://ja.wikipedia.org/wiki/gen{i}",
    }
    for i in range(10)
]

# DB が INSERT 後に返す行（uuid は DB が付与する想定で文字列で固定）
_SAVED_ROWS = [
    {**item, "id": f"c0000000-0000-0000-0000-{i:012d}"}
    for i, item in enumerate(_GEMINI_ITEMS)
]

# フォールバック用 DB 行（feed サービスが使う）
_FALLBACK_DB_ROWS = [
    {
        "id": f"fb000000-0000-0000-0000-{i:012d}",
        "title": f"フォールバック{i}",
        "summary": f"フォールバック概要{i}",
        "genre": "自然・科学・宇宙",
        "tags": ["タグ1", "タグ2"],
        "source_title": "Wikipedia",
        "source_url": f"https://ja.wikipedia.org/wiki/fb{i}",
    }
    for i in range(10)
]


def test_generate_success_returns_201_with_10_items():
    """正常系: Gemini 成功 → DB 保存 → 201 + 10 件返却。"""
    with (
        patch("app.routers.trivia.gemini_generate", return_value=_GEMINI_ITEMS),
        patch("app.repositories.trivia_repo.save_trivia_batch", return_value=_SAVED_ROWS),
        patch(
            "app.repositories.trivia_repo.fetch_trivia_from_db",
            side_effect=AssertionError("fallback must not be used"),
        ),
    ):
        response = client.post("/trivia/generate")

    assert response.status_code == 201
    data = response.json()
    assert len(data["items"]) == 10
    for field in ("id", "title", "summary", "genre", "tags", "source_title", "source_url"):
        assert field in data["items"][0], f"フィールド '{field}' が欠けています"


def test_generate_falls_back_on_gemini_403():
    """Gemini が GeminiGenerationError（403 相当）を送出した場合はフォールバックを返す。"""
    with (
        patch(
            "app.routers.trivia.gemini_generate",
            side_effect=GeminiGenerationError("403 PERMISSION_DENIED"),
        ),
        patch(
            "app.repositories.trivia_repo.fetch_trivia_from_db",
            return_value=_FALLBACK_DB_ROWS,
        ),
    ):
        response = client.post("/trivia/generate")

    assert response.status_code == 201
    assert len(response.json()["items"]) == 10


def test_generate_falls_back_on_bad_json():
    """Gemini が不正 JSON を返した場合（GeminiGenerationError）もフォールバックを返す。"""
    with (
        patch(
            "app.routers.trivia.gemini_generate",
            side_effect=GeminiGenerationError("JSON parse error"),
        ),
        patch(
            "app.repositories.trivia_repo.fetch_trivia_from_db",
            return_value=_FALLBACK_DB_ROWS,
        ),
    ):
        response = client.post("/trivia/generate")

    assert response.status_code == 201
    assert len(response.json()["items"]) == 10


def test_generate_falls_back_when_api_key_not_configured():
    """GEMINI_API_KEY 未設定（GeminiGenerationError）でもフォールバックを返す。"""
    with (
        patch(
            "app.routers.trivia.gemini_generate",
            side_effect=GeminiGenerationError("GEMINI_API_KEY is not configured"),
        ),
        patch(
            "app.repositories.trivia_repo.fetch_trivia_from_db",
            return_value=_FALLBACK_DB_ROWS,
        ),
    ):
        response = client.post("/trivia/generate")

    assert response.status_code == 201
    data = response.json()
    assert len(data["items"]) == 10


def test_generate_fallback_uses_bundled_data_when_db_also_fails():
    """Gemini 失敗 + DB も失敗 → バンドル済み fallback.json から返す。"""
    with (
        patch(
            "app.routers.trivia.gemini_generate",
            side_effect=GeminiGenerationError("503"),
        ),
        patch(
            "app.repositories.trivia_repo.fetch_trivia_from_db",
            side_effect=Exception("DB connection refused"),
        ),
    ):
        response = client.post("/trivia/generate")

    assert response.status_code == 201
    assert len(response.json()["items"]) == 10


def test_generate_falls_back_when_save_fails():
    """Gemini 成功後に DB 保存が失敗してもフォールバックを返す。"""
    with (
        patch("app.routers.trivia.gemini_generate", return_value=_GEMINI_ITEMS),
        patch(
            "app.repositories.trivia_repo.save_trivia_batch",
            side_effect=RuntimeError("DB unavailable"),
        ),
        patch(
            "app.repositories.trivia_repo.fetch_trivia_from_db",
            return_value=_FALLBACK_DB_ROWS,
        ),
    ):
        response = client.post("/trivia/generate")

    assert response.status_code == 201
    assert response.json()["items"][0]["title"] == "フォールバック0"


def test_generate_falls_back_when_save_returns_too_few_rows():
    """INSERT の返却件数が10件未満なら、不完全な生成結果を返さない。"""
    with (
        patch("app.routers.trivia.gemini_generate", return_value=_GEMINI_ITEMS),
        patch(
            "app.repositories.trivia_repo.save_trivia_batch",
            return_value=_SAVED_ROWS[:9],
        ),
        patch(
            "app.repositories.trivia_repo.fetch_trivia_from_db",
            return_value=_FALLBACK_DB_ROWS,
        ),
    ):
        response = client.post("/trivia/generate")

    assert response.status_code == 201
    assert len(response.json()["items"]) == 10
    assert response.json()["items"][0]["title"] == "フォールバック0"


def _gemini_payload() -> dict:
    return {
        "items": [
            {
                **item,
                "confidence_note": "MVPでは自動ファクトチェック未実施",
            }
            for item in _GEMINI_ITEMS
        ]
    }


def test_gemini_service_validates_and_removes_confidence_note():
    """SDK 応答を検証し、DB に保存しないフィールドを除去する。"""
    fake_client = MagicMock()
    fake_client.models.generate_content.return_value = SimpleNamespace(
        text=json.dumps(_gemini_payload(), ensure_ascii=False)
    )

    with patch(
        "app.services.gemini_service.genai.Client",
        return_value=fake_client,
    ) as client_constructor:
        items = gemini_service.generate()

    assert len(items) == 10
    assert "confidence_note" not in items[0]
    assert client_constructor.call_args.kwargs["http_options"].timeout == 60_000
    client_kwargs = fake_client.models.generate_content.call_args.kwargs
    assert client_kwargs["config"].response_mime_type == "application/json"
    assert client_kwargs["config"].response_schema is GeminiResponse
    assert (
        client_kwargs["config"].thinking_config.thinking_level
        == types.ThinkingLevel.MINIMAL
    )


def test_gemini_prompt_includes_preferred_genres_and_tags():
    """選択・ブックマーク由来のシグナルを生成プロンプトへ含める。"""
    fake_client = MagicMock()
    fake_client.models.generate_content.return_value = SimpleNamespace(
        text=json.dumps(_gemini_payload(), ensure_ascii=False)
    )

    with patch(
        "app.services.gemini_service.genai.Client",
        return_value=fake_client,
    ):
        gemini_service.generate(
            preferred_genres=["生き物"],
            preferred_tags=["深海", "魚"],
        )

    prompt = fake_client.models.generate_content.call_args.kwargs["contents"]
    assert "優先ジャンル: 生き物" in prompt
    assert "優先タグ: 深海, 魚" in prompt


@pytest.mark.parametrize(
    "sdk_result",
    [
        PermissionError("403 PERMISSION_DENIED"),
        RuntimeError("429 RESOURCE_EXHAUSTED"),
        TimeoutError("request timed out"),
    ],
)
def test_gemini_service_wraps_sdk_failures(sdk_result: Exception):
    """権限・レート制限・タイムアウトを統一例外へ変換する。"""
    fake_client = MagicMock()
    fake_client.models.generate_content.side_effect = sdk_result

    with (
        patch("app.services.gemini_service.genai.Client", return_value=fake_client),
        pytest.raises(GeminiGenerationError),
    ):
        gemini_service.generate()


@pytest.mark.parametrize(
    "response_text",
    [
        "",
        "not-json",
        json.dumps({"items": []}),
    ],
)
def test_gemini_service_rejects_empty_invalid_or_unvalidated_output(response_text: str):
    """空応答・不正JSON・件数違いを統一例外へ変換する。"""
    fake_client = MagicMock()
    fake_client.models.generate_content.return_value = SimpleNamespace(text=response_text)

    with (
        patch("app.services.gemini_service.genai.Client", return_value=fake_client),
        pytest.raises(GeminiGenerationError),
    ):
        gemini_service.generate()


def test_gemini_response_rejects_invalid_genre_and_url():
    payload = _gemini_payload()
    payload["items"][0]["genre"] = "対象外"
    payload["items"][1]["source_url"] = "ftp://example.com/source"

    with pytest.raises(ValueError):
        GeminiResponse.model_validate(payload)


def test_save_trivia_batch_inserts_only_allowed_columns():
    """id と confidence_note を INSERT payload に含めない。"""
    source_items = [
        {
            **item,
            "id": "c0000000-0000-0000-0000-000000000000",
            "confidence_note": "保存しない",
        }
        for item in _GEMINI_ITEMS
    ]
    fake_client = MagicMock()
    fake_client.table.return_value.insert.return_value.execute.return_value = (
        SimpleNamespace(data=_SAVED_ROWS)
    )

    with patch("app.repositories.trivia_repo.create_client", return_value=fake_client):
        trivia_repo.save_trivia_batch(source_items)

    inserted_rows = fake_client.table.return_value.insert.call_args.args[0]
    assert set(inserted_rows[0]) == {
        "title",
        "summary",
        "genre",
        "tags",
        "source_title",
        "source_url",
    }


def test_generate_passes_preferred_genres_when_logged_in():
    """ログイン中は選択ジャンルを Gemini に渡す。"""
    from types import SimpleNamespace
    auth = MagicMock()
    auth.get_user.return_value = SimpleNamespace(
        user=SimpleNamespace(id="user-123")
    )
    supabase = SimpleNamespace(auth=auth)

    with (
        patch("app.dependencies.create_client", return_value=supabase),
        patch(
            "app.repositories.preferences_repo.get_preferences",
            return_value=["自然・科学・宇宙", "歴史・偉人"],
        ),
        patch("app.repositories.bookmark_repo.list_bookmarks", return_value=[]),
        patch("app.routers.trivia.gemini_generate", return_value=_GEMINI_ITEMS) as mock_gen,
        patch("app.repositories.trivia_repo.save_trivia_batch", return_value=_SAVED_ROWS),
    ):
        response = client.post(
            "/trivia/generate",
            headers={"Authorization": "Bearer test-token"},
        )

    assert response.status_code == 201
    mock_gen.assert_called_once_with(
        preferred_genres=["自然・科学・宇宙", "歴史・偉人"],
        preferred_tags=None,
    )


def test_generate_uses_bookmark_genres_and_tags():
    """ブックマーク由来のジャンルとタグをGeminiへ渡す。"""
    auth = MagicMock()
    auth.get_user.return_value = SimpleNamespace(
        user=SimpleNamespace(id="user-123")
    )
    supabase = SimpleNamespace(auth=auth)
    bookmarks = [
        {
            "trivia": {
                "genre": "生き物",
                "tags": ["深海", "魚"],
            }
        }
    ]

    with (
        patch("app.dependencies.create_client", return_value=supabase),
        patch("app.repositories.preferences_repo.get_preferences", return_value=[]),
        patch(
            "app.repositories.bookmark_repo.list_bookmarks",
            return_value=bookmarks,
        ),
        patch(
            "app.routers.trivia.gemini_generate",
            return_value=_GEMINI_ITEMS,
        ) as mock_gen,
        patch(
            "app.repositories.trivia_repo.save_trivia_batch",
            return_value=_SAVED_ROWS,
        ),
    ):
        response = client.post(
            "/trivia/generate",
            headers={"Authorization": "Bearer test-token"},
        )

    assert response.status_code == 201
    mock_gen.assert_called_once_with(
        preferred_genres=["生き物"],
        preferred_tags=["深海", "魚"],
    )


def test_generate_returns_401_on_invalid_token():
    """無効なトークンは 401 を返す。"""
    with patch(
        "app.dependencies.create_client",
        side_effect=RuntimeError("Supabase error"),
    ):
        response = client.post(
            "/trivia/generate",
            headers={"Authorization": "Bearer invalid-token"},
        )

    assert response.status_code == 401


def test_generate_failure_uses_personalized_fallback_when_logged_in():
    """ログイン中の生成失敗でもパーソナライズ済みフィードを返す。"""
    auth = MagicMock()
    auth.get_user.return_value = SimpleNamespace(
        user=SimpleNamespace(id="user-123")
    )
    supabase = SimpleNamespace(auth=auth)

    with (
        patch("app.dependencies.create_client", return_value=supabase),
        patch("app.repositories.preferences_repo.get_preferences", return_value=[]),
        patch("app.repositories.bookmark_repo.list_bookmarks", return_value=[]),
        patch(
            "app.routers.trivia.gemini_generate",
            side_effect=GeminiGenerationError("403"),
        ),
        patch(
            "app.routers.trivia.feed_service.get_personalized_feed",
            return_value=_FALLBACK_DB_ROWS,
        ) as mock_personalized_feed,
    ):
        response = client.post(
            "/trivia/generate",
            headers={"Authorization": "Bearer test-token"},
        )

    assert response.status_code == 201
    mock_personalized_feed.assert_called_once_with("user-123")


def test_generate_hides_internal_error_when_fallback_also_fails():
    """最終失敗時も外部サービスのエラー詳細をレスポンスへ含めない。"""
    with (
        patch(
            "app.routers.trivia.gemini_generate",
            side_effect=GeminiGenerationError("secret internal detail"),
        ),
        patch(
            "app.routers.trivia.feed_service.get_feed",
            side_effect=RuntimeError("database password leaked"),
        ),
    ):
        response = client.post("/trivia/generate")

    assert response.status_code == 503
    assert response.json() == {"detail": "Trivia generation temporarily unavailable"}
