from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_optional_user_id
from app.models.trivia import TriviaFeedResponse, TriviaItem
from app.repositories import trivia_repo
from app.services import feed as feed_service
from app.services.gemini_service import GeminiGenerationError, generate as gemini_generate
from app.services.personalization import rank_preferences

router = APIRouter()


def _get_generation_fallback(user_id: str | None = None) -> TriviaFeedResponse:
    try:
        items = (
            feed_service.get_personalized_feed(user_id)
            if user_id
            else feed_service.get_feed()
        )
        return TriviaFeedResponse(items=items)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Trivia generation temporarily unavailable",
        ) from exc


@router.get("/trivia/feed", response_model=TriviaFeedResponse)
def get_trivia_feed(
    user_id: str | None = Depends(get_optional_user_id),
) -> TriviaFeedResponse:
    if user_id:
        items = feed_service.get_personalized_feed(user_id)
    else:
        items = feed_service.get_feed()
    return TriviaFeedResponse(items=items)


@router.post("/trivia/generate", response_model=TriviaFeedResponse, status_code=201)
def generate_trivia(
    user_id: str | None = Depends(get_optional_user_id),
) -> TriviaFeedResponse:
    """
    Gemini で雑学 10 件を生成し、Supabase へ保存して返す。
    ログイン中なら選択ジャンルを Gemini プロンプトへ反映する。
    Gemini または DB 保存が失敗した場合はフォールバックデータを返す。
    """
    preferred_genres: list[str] = []
    preferred_tags: list[str] = []
    if user_id:
        selected, bookmark_genres, bookmark_tags = feed_service.get_user_signals(
            user_id
        )
        preferred_genres, preferred_tags = rank_preferences(
            selected,
            bookmark_genres,
            bookmark_tags,
        )

    try:
        raw_items = gemini_generate(
            preferred_genres=preferred_genres or None,
            preferred_tags=preferred_tags or None,
        )
    except GeminiGenerationError:
        return _get_generation_fallback(user_id)

    try:
        saved = trivia_repo.save_trivia_batch(raw_items)
        if len(saved) != 10:
            raise ValueError("Supabase did not return all inserted trivia rows")
        items = [TriviaItem(**row) for row in saved]
        return TriviaFeedResponse(items=items)
    except Exception:
        return _get_generation_fallback(user_id)
