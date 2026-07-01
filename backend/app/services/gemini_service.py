import json

from google import genai
from google.genai import types

from app.config import settings
from app.models.gemini import GeminiResponse

_GENRES = (
    "自然・科学・宇宙\n生き物\n人体・医学\n歴史・偉人\n言葉・語源\n"
    "食べ物・料理\n地理・世界の文化\n生活・日常の疑問\nエンタメ・芸術・スポーツ\nサブカル・マニアック"
)
_TIMEOUT_MS = 60_000


class GeminiGenerationError(Exception):
    """Gemini の失敗（403, 429, タイムアウト, 不正 JSON, 検証エラー）を統一的に表す。"""


def _build_prompt(
    preferred_genres: list[str] | None,
    excluded_topics: list[str] | None,
) -> str:
    preferred = ", ".join(preferred_genres) if preferred_genres else "なし"
    excluded = ", ".join(excluded_topics) if excluded_topics else "なし"
    return f"""あなたは雑学アプリ用のコンテンツ生成AIです。
ユーザーが横スワイプで短時間に読める雑学を10件生成してください。

条件:
- 日本語で出力する
- 必ずJSONのみを返す（マークダウンコードブロック不要）
- 10件すべて異なるテーマにする
- 各雑学は以下の10ジャンルのいずれかに分類する:
{_GENRES}
- タイトルは30字以内
- 概要は300字以内
- タグは2〜4個
- 情報源をHTTPまたはHTTPSのURLで1件以上つける
- 医療判断、法律判断、投資助言、政治的主張、危険行為の推奨は避ける
- 断定しすぎず、雑学として自然に読める文章にする

優先ジャンル: {preferred}
避ける雑学IDまたは既出テーマ: {excluded}

出力形式（JSONのみ、他のテキスト不要）:
{{
  "items": [
    {{
      "title": "30字以内のタイトル",
      "summary": "300字以内の概要",
      "genre": "10ジャンルのいずれか",
      "tags": ["タグ1", "タグ2"],
      "source_title": "情報源のタイトル",
      "source_url": "https://example.com",
      "confidence_note": "情報源に基づくが、MVPでは自動ファクトチェック未実施"
    }}
  ]
}}"""


def generate(
    preferred_genres: list[str] | None = None,
    excluded_topics: list[str] | None = None,
) -> list[dict]:
    """
    Gemini で雑学 10 件を生成し、DB 挿入用 dict のリストを返す。

    失敗した場合は GeminiGenerationError を送出する（403, 429, タイムアウト,
    不正 JSON, 検証エラーすべて含む）。API キーやレスポンス全体はログに出さない。
    """
    if not settings.GEMINI_API_KEY:
        raise GeminiGenerationError("GEMINI_API_KEY is not configured")

    try:
        client = genai.Client(
            api_key=settings.GEMINI_API_KEY,
            http_options=types.HttpOptions(timeout=_TIMEOUT_MS),
        )
        prompt = _build_prompt(preferred_genres, excluded_topics)
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=GeminiResponse,
                thinking_config=types.ThinkingConfig(thinking_level="minimal"),
            ),
        )

        if not response.text:
            raise GeminiGenerationError("Gemini returned an empty response")

        data = json.loads(response.text)
        validated = GeminiResponse.model_validate(data)

        return [
            {
                "title": item.title,
                "summary": item.summary,
                "genre": item.genre,
                "tags": item.tags,
                "source_title": item.source_title,
                "source_url": str(item.source_url),
            }
            for item in validated.items
        ]

    except GeminiGenerationError:
        raise
    except Exception as exc:
        # 内部エラーの詳細（APIキー等）を外へ漏らさない
        raise GeminiGenerationError(f"Generation failed: {type(exc).__name__}") from exc
