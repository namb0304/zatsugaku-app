from fastapi import APIRouter, HTTPException

from app.models.trivia import TriviaFeedResponse, TriviaItem
from app.repositories import trivia_repo
from app.services import feed as feed_service
from app.services.gemini_service import GeminiGenerationError, generate as gemini_generate

router = APIRouter()


def _get_generation_fallback() -> TriviaFeedResponse:
    try:
        return TriviaFeedResponse(items=feed_service.get_feed())
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Trivia generation temporarily unavailable",
        ) from exc


@router.get("/trivia/feed", response_model=TriviaFeedResponse)
def get_trivia_feed() -> TriviaFeedResponse:
    items = feed_service.get_feed()
    return TriviaFeedResponse(items=items)


@router.post("/trivia/generate", response_model=TriviaFeedResponse, status_code=201)
def generate_trivia() -> TriviaFeedResponse:
    """
    Gemini で雑学 10 件を生成し、Supabase へ保存して返す。
    Gemini または DB 保存が失敗した場合はフォールバックデータを返す。
    """
    try:
        raw_items = gemini_generate()
    except GeminiGenerationError:
        return _get_generation_fallback()

    try:
        saved = trivia_repo.save_trivia_batch(raw_items)
        if len(saved) != 10:
            raise ValueError("Supabase did not return all inserted trivia rows")
        items = [TriviaItem(**row) for row in saved]
        return TriviaFeedResponse(items=items)
    except Exception:
        return _get_generation_fallback()
