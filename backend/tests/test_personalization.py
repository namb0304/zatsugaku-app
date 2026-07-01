"""score_items() の単体テスト。外部依存なし。"""
from app.models.trivia import TriviaItem
from app.services.personalization import rank_preferences, score_items

UUID_A = "a0000000-0000-4000-8000-000000000001"
UUID_B = "b0000000-0000-4000-8000-000000000001"
UUID_C = "c0000000-0000-4000-8000-000000000001"


def _item(item_id: str, genre: str, tags: list[str] | None = None) -> TriviaItem:
    return TriviaItem(
        id=item_id,
        title="タイトル",
        summary="概要テキスト",
        genre=genre,
        tags=tags if tags is not None else ["デフォルト1", "デフォルト2"],
        source_title="Wikipedia",
        source_url="https://ja.wikipedia.org/wiki/test",
    )


def test_preferred_genre_scores_plus3():
    """選択ジャンルに一致する雑学が上位に来る。"""
    items = [
        _item(UUID_A, "自然・科学・宇宙"),
        _item(UUID_B, "歴史・偉人"),
    ]
    result = score_items(items, ["歴史・偉人"], [], [], set())
    assert str(result[0].id) == UUID_B


def test_bookmark_genre_scores_plus2():
    """ブックマーク済みジャンルが優先される。"""
    items = [
        _item(UUID_A, "自然・科学・宇宙"),
        _item(UUID_B, "食べ物・料理"),
    ]
    result = score_items(items, [], ["食べ物・料理"], [], set())
    assert str(result[0].id) == UUID_B


def test_bookmark_tag_scores_plus1_each():
    """ブックマーク済みタグは一致ごとに +1。"""
    items = [
        _item(UUID_A, "自然・科学・宇宙", ["タグ1", "その他"]),   # +1（タグ1のみ一致）
        _item(UUID_B, "自然・科学・宇宙", ["タグ1", "タグ2"]),    # +2（両方一致）
    ]
    result = score_items(items, [], [], ["タグ1", "タグ2"], set())
    assert str(result[0].id) == UUID_B


def test_viewed_items_are_excluded():
    """視聴済みは候補から除外される。"""
    items = [
        _item(UUID_A, "自然・科学・宇宙"),  # 視聴済み
        _item(UUID_B, "自然・科学・宇宙"),  # 未視聴
    ]
    result = score_items(items, [], [], [], {UUID_A})
    assert [str(item.id) for item in result] == [UUID_B]


def test_high_score_viewed_is_still_excluded():
    """高スコアでも視聴済みなら候補から除外される。"""
    items = [
        _item(UUID_A, "歴史・偉人"),       # 視聴済み, preferred_genre +3
        _item(UUID_B, "自然・科学・宇宙"),  # 未視聴, score=0
    ]
    result = score_items(items, ["歴史・偉人"], [], [], {UUID_A})
    assert [str(item.id) for item in result] == [UUID_B]


def test_stable_sort_preserves_order_for_same_score():
    """同スコアでは元の順序を維持する（stable sort）。"""
    items = [
        _item(UUID_A, "自然・科学・宇宙"),
        _item(UUID_B, "自然・科学・宇宙"),
        _item(UUID_C, "自然・科学・宇宙"),
    ]
    result = score_items(items, [], [], [], set())
    assert [str(it.id) for it in result] == [UUID_A, UUID_B, UUID_C]


def test_combined_weights_example():
    """
    CLAUDE.md の確定仕様を再現する結合テスト:
      item A: genre=歴史, preferred(+3) + bookmark_genre(+2) → score=5
      item B: genre=自然, tags=[タグ1,タグ2], bookmark_tag(+1+1)  → score=2
      item C: genre=食べ物                                         → score=0
    """
    items = [
        _item(UUID_A, "歴史・偉人"),
        _item(UUID_B, "自然・科学・宇宙", ["タグ1", "タグ2"]),
        _item(UUID_C, "食べ物・料理"),
    ]
    result = score_items(
        items,
        preferred_genres=["歴史・偉人"],
        bookmark_genres=["歴史・偉人"],
        bookmark_tags=["タグ1", "タグ2"],
        viewed_ids=set(),
    )
    assert str(result[0].id) == UUID_A  # score=5
    assert str(result[1].id) == UUID_B  # score=2
    assert str(result[2].id) == UUID_C  # score=0


def test_empty_inputs_returns_original_order():
    """全入力が空でも元の順序で返す。"""
    items = [
        _item(UUID_A, "自然・科学・宇宙"),
        _item(UUID_B, "歴史・偉人"),
    ]
    result = score_items(items, [], [], [], set())
    assert [str(it.id) for it in result] == [UUID_A, UUID_B]


def test_does_not_mutate_input():
    """元リストを変更しない。"""
    items = [
        _item(UUID_A, "歴史・偉人"),
        _item(UUID_B, "自然・科学・宇宙"),
    ]
    original_ids = [str(it.id) for it in items]
    score_items(items, ["自然・科学・宇宙"], [], [], set())
    assert [str(it.id) for it in items] == original_ids


def test_repeated_bookmark_signals_accumulate():
    """同じジャンルを複数回ブックマークすると重みが累積する。"""
    items = [
        _item(UUID_A, "歴史・偉人"),
        _item(UUID_B, "自然・科学・宇宙", ["宇宙", "科学"]),
    ]
    result = score_items(
        items,
        preferred_genres=[],
        bookmark_genres=["自然・科学・宇宙", "自然・科学・宇宙"],
        bookmark_tags=[],
        viewed_ids=set(),
    )
    assert str(result[0].id) == UUID_B


def test_rank_preferences_uses_all_weights():
    """Gemini向けシグナルも確定済みの重み順に並ぶ。"""
    genres, tags = rank_preferences(
        preferred_genres=["歴史・偉人"],
        bookmark_genres=["自然・科学・宇宙", "自然・科学・宇宙"],
        bookmark_tags=["宇宙", "科学", "宇宙"],
    )
    assert genres == ["自然・科学・宇宙", "歴史・偉人"]
    assert tags == ["宇宙", "科学"]
