from pydantic import BaseModel, Field, HttpUrl, field_validator

from app.models.trivia import ALLOWED_GENRES


class GeminiTriviaItem(BaseModel):
    title: str = Field(min_length=1, max_length=30)
    summary: str = Field(min_length=1, max_length=300)
    genre: str
    tags: list[str] = Field(min_length=2, max_length=4)
    source_title: str = Field(min_length=1)
    source_url: HttpUrl
    # confidence_note は受け取るが DB には保存しない
    confidence_note: str | None = None

    @field_validator("genre")
    @classmethod
    def genre_must_be_allowed(cls, value: str) -> str:
        if value not in ALLOWED_GENRES:
            raise ValueError(f"genre '{value}' is not in the allowed list")
        return value

    @field_validator("tags")
    @classmethod
    def tags_must_be_non_empty_and_unique(cls, value: list[str]) -> list[str]:
        tags = [tag.strip() for tag in value]
        if any(not tag for tag in tags):
            raise ValueError("tags must not contain empty values")
        if len(set(tags)) != len(tags):
            raise ValueError("tags must be unique")
        return tags


class GeminiResponse(BaseModel):
    items: list[GeminiTriviaItem] = Field(min_length=10, max_length=10)
