from uuid import UUID

from fastapi import APIRouter, Depends

from app.dependencies import get_current_user_id
from app.models.bookmark import (
    BookmarkCreate,
    BookmarkCreateResponse,
    BookmarkItem,
    BookmarkListResponse,
)
from app.repositories import bookmark_repo

router = APIRouter(prefix="/bookmarks", tags=["bookmarks"])


@router.get("", response_model=BookmarkListResponse)
def get_bookmarks(user_id: str = Depends(get_current_user_id)) -> BookmarkListResponse:
    rows = bookmark_repo.list_bookmarks(user_id)
    items = [
        BookmarkItem(id=row["id"], trivia=row["trivia"], created_at=row["created_at"])
        for row in rows
    ]
    return BookmarkListResponse(items=items)


@router.post("", status_code=201, response_model=BookmarkCreateResponse)
def create_bookmark(
    body: BookmarkCreate,
    user_id: str = Depends(get_current_user_id),
) -> BookmarkCreateResponse:
    row = bookmark_repo.add_bookmark(user_id, str(body.trivia_id))
    return BookmarkCreateResponse(**row)


@router.delete("/{trivia_id}", status_code=204)
def delete_bookmark(
    trivia_id: UUID,
    user_id: str = Depends(get_current_user_id),
) -> None:
    bookmark_repo.remove_bookmark(user_id, str(trivia_id))
