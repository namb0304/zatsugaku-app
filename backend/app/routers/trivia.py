from fastapi import APIRouter

from app.models.trivia import TriviaFeedResponse
from app.services import feed as feed_service

router = APIRouter()


@router.get("/trivia/feed", response_model=TriviaFeedResponse)
def get_trivia_feed() -> TriviaFeedResponse:
    items = feed_service.get_feed()
    return TriviaFeedResponse(items=items)
