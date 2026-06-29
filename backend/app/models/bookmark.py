from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl, field_validator

from app.models.trivia import ALLOWED_GENRES


class BookmarkCreate(BaseModel):
    trivia_id: UUID


class TriviaInBookmark(BaseModel):
    id: UUID
    title: str
    summary: str
    genre: str
    source_title: str
    source_url: HttpUrl


class BookmarkItem(BaseModel):
    id: UUID
    trivia: TriviaInBookmark
    created_at: datetime


class BookmarkListResponse(BaseModel):
    items: list[BookmarkItem]


class BookmarkCreateResponse(BaseModel):
    id: UUID
    trivia_id: UUID
    created_at: datetime


class PreferencesRequest(BaseModel):
    genres: list[str] = Field(default_factory=list, max_length=10)

    @field_validator("genres")
    @classmethod
    def validate_genres(cls, genres: list[str]) -> list[str]:
        if any(genre not in ALLOWED_GENRES for genre in genres):
            raise ValueError("genres must contain only allowed genres")
        if len(set(genres)) != len(genres):
            raise ValueError("genres must not contain duplicates")
        return genres


class PreferencesResponse(BaseModel):
    genres: list[str]


class ViewHistoryCreate(BaseModel):
    trivia_id: UUID
