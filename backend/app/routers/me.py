from fastapi import APIRouter, Depends

from app.dependencies import get_current_user_id
from app.models.bookmark import (
    PreferencesRequest,
    PreferencesResponse,
    ViewHistoryCreate,
)
from app.repositories import preferences_repo, view_history_repo

router = APIRouter(prefix="/me", tags=["me"])


@router.get("/preferences", response_model=PreferencesResponse)
def get_preferences(user_id: str = Depends(get_current_user_id)) -> PreferencesResponse:
    genres = preferences_repo.get_preferences(user_id)
    return PreferencesResponse(genres=genres)


@router.put("/preferences", response_model=PreferencesResponse)
def update_preferences(
    body: PreferencesRequest,
    user_id: str = Depends(get_current_user_id),
) -> PreferencesResponse:
    saved = preferences_repo.set_preferences(user_id, body.genres)
    return PreferencesResponse(genres=saved)


@router.post("/view-history", status_code=201)
def record_view_history(
    body: ViewHistoryCreate,
    user_id: str = Depends(get_current_user_id),
) -> dict:
    view_history_repo.record_view(user_id, str(body.trivia_id))
    return {}
