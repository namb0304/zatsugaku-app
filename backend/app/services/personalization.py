"""
ルールベースのパーソナライズ重み計算。

採点基準 (1 アイテムあたり):
  - item.genre が選択ジャンルに含まれる          : +3
  - item.genre がブックマーク済み雑学の genre と一致 : 1 件ごとに +2
  - item.tags がブックマーク済みの tag と一致        : 一致 1 件ごとに +1

視聴済み雑学は候補から除外する。
同スコアでは元の順序を維持する (stable sort)。
"""
from __future__ import annotations

from collections import Counter

from app.models.trivia import TriviaItem


def rank_preferences(
    preferred_genres: list[str],
    bookmark_genres: list[str],
    bookmark_tags: list[str],
) -> tuple[list[str], list[str]]:
    """Geminiへ渡すジャンルとタグを、確定済みの重み順に並べる。"""
    genre_scores: Counter[str] = Counter()
    for genre in preferred_genres:
        genre_scores[genre] += 3
    for genre in bookmark_genres:
        genre_scores[genre] += 2

    tag_scores = Counter(bookmark_tags)
    ranked_genres = sorted(genre_scores, key=genre_scores.get, reverse=True)
    ranked_tags = sorted(tag_scores, key=tag_scores.get, reverse=True)
    return ranked_genres, ranked_tags


def score_items(
    items: list[TriviaItem],
    preferred_genres: list[str],
    bookmark_genres: list[str],
    bookmark_tags: list[str],
    viewed_ids: set[str],
) -> list[TriviaItem]:
    """重みでスコアリングし並べ替えた新リストを返す。元リストを変更しない。"""
    pref_set = set(preferred_genres)
    bm_genre_counts = Counter(bookmark_genres)
    bm_tag_counts = Counter(bookmark_tags)

    def _score(item: TriviaItem) -> int:
        s = 0
        if item.genre in pref_set:
            s += 3
        s += bm_genre_counts[item.genre] * 2
        for tag in item.tags:
            s += bm_tag_counts[tag]
        return s

    unviewed = [it for it in items if str(it.id) not in viewed_ids]
    unviewed.sort(key=_score, reverse=True)
    return unviewed
