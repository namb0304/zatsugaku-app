from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl, field_validator

ALLOWED_GENRES = frozenset(
    {
        "自然・科学・宇宙",
        "生き物",
        "人体・医学",
        "歴史・偉人",
        "言葉・語源",
        "食べ物・料理",
        "地理・世界の文化",
        "生活・日常の疑問",
        "エンタメ・芸術・スポーツ",
        "サブカル・マニアック",
    }
)


class TriviaItem(BaseModel):
    id: UUID
    title: str = Field(min_length=1, max_length=30)
    summary: str = Field(min_length=1, max_length=300)
    genre: str
    tags: list[str] = Field(min_length=2, max_length=4)
    source_title: str = Field(min_length=1)
    source_url: HttpUrl

    @field_validator("genre")
    @classmethod
    def validate_genre(cls, value: str) -> str:
        if value not in ALLOWED_GENRES:
            raise ValueError("genre must be one of the 10 allowed genres")
        return value


class TriviaFeedResponse(BaseModel):
    items: list[TriviaItem]
