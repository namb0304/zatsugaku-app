"use client";

// =====================================================================
// スワイプ画面 (/swipe)
// =====================================================================
//
// 【データ取得】
//   接続: GET /trivia/feed でカード10件を取得（クエリ: selectedGenres）
//   接続: 10枚使い切ったら POST /trivia/generate で次の10件を生成 → dealNewCards() を呼ぶ
//   接続: 生成失敗時は public/fallback.json 等の事前データを表示
//
// 【スワイプ操作】（画面全体で検知）
//   右スワイプ / → キー → 次のカードへ進む（goLeft: activeIndex を増やす）
//   左スワイプ / ← キー → 前のカードへ戻る（goRight: activeIndex を減らす）
//   上スワイプ / ↑ キー → ブックマーク保存（addBookmark → POST /bookmarks）
//   カードタップ    → そのカードを選択
//
// 【ブックマーク】
//   接続: POST /bookmarks に { trivia_id } を送信
//   未ログイン時 → ログイン誘導モーダルを表示（TODO）
//
// 【視聴履歴】
//   接続（ログインユーザー）: Supabase の viewed_history テーブルに記録（TODO）
//   接続（未ログイン）: localStorage に trivia_id を保存して再表示を防ぐ（TODO）
//
// 【ドロー演出】
//   10枚使い切り → dealNewCards() が全カードを一瞬重ねてからファンアウト
//   "stacked" → "fanning" → "idle" の3フェーズで管理
// =====================================================================

import { useState, useEffect, useCallback, useRef, CSSProperties } from "react";
import Link from "next/link";

// TODO: GET /trivia/feed のレスポンスに差し替える
const MOCK_TRIVIA = [
  { id: 1,  genre: "自然・科学・宇宙",        title: "宇宙は今も膨張し続けている",           summary: "1929年にエドウィン・ハッブルが発見した「ハッブルの法則」によると、宇宙は現在も加速しながら膨張しています。原因はいまだ謎とされ、「ダークエネルギー」と呼ばれる未知のエネルギーが関係していると考えられています。宇宙の約68%をダークエネルギーが占めると推測されています。", source_title: "Wikipedia", source_url: "#" },
  { id: 2,  genre: "生き物",                 title: "タコには心臓が3つある",                summary: "タコの体には心臓が3つあります。1つは全身に血液を送る体心臓、残り2つはエラに血液を送るエラ心臓です。また血液はヘモシアニンを含むため青色をしています。酸素が少ない深海での生活に適応した進化の結果です。", source_title: "Wikipedia", source_url: "#" },
  { id: 3,  genre: "歴史・偉人",              title: "ナポレオンの身長は実は平均的だった",      summary: "「ナポレオンは背が低かった」という通説は誤りで、当時のフランスの平均身長（約170cm）とほぼ同じだったとされています。この誤解はイギリスのプロパガンダや、フランスとイギリスでの身長単位の違いから生まれたと考えられています。", source_title: "Wikipedia", source_url: "#" },
  { id: 4,  genre: "食べ物・料理",            title: "バナナは厳密には草の実",                summary: "バナナの木は「草」の一種です。バナナの茎は葉の根元が重なり合っただけの「偽茎」であり、木質ではありません。そのためバナナは世界最大の草本植物の果実ということになります。", source_title: "Wikipedia", source_url: "#" },
  { id: 5,  genre: "言葉・語源",              title: "「トイレ」の語源はフランス語",           summary: "「トイレ」はフランス語の「toilette（トワレット）」に由来し、もともとは「化粧台」「身だしなみを整えること」を意味していました。転じて化粧室・洗面所を指すようになりました。英語の「toilet」も同じ語源です。", source_title: "Wikipedia", source_url: "#" },
  { id: 6,  genre: "人体・医学",              title: "人間の骨は生まれた時が一番多い",          summary: "生まれたての赤ちゃんの骨の数は約300本ですが、大人になると約206本に減ります。これは成長の過程で複数の骨が融合するためです。特に頭蓋骨や骨盤の骨は複数のパーツが一体化します。", source_title: "Wikipedia", source_url: "#" },
  { id: 7,  genre: "地理・世界の文化",         title: "オーストラリアは大陸でもあり島でもある",  summary: "オーストラリアは周囲を海に囲まれた世界最小の大陸であり、世界最大の島でもあります。厳密には「大陸」と「島」の定義によって分類が変わりますが、地理学では大陸として扱われることがほとんどです。", source_title: "Wikipedia", source_url: "#" },
  { id: 8,  genre: "生活・日常の疑問",         title: "電子レンジは偶然発明された",             summary: "電子レンジは1945年、レーダー研究中のパーシー・スペンサーがマグネトロンの近くに置いていたチョコレートが溶けていることに気づいたことで偶然発明されました。当初は冷蔵庫ほどの大きさがありました。", source_title: "Wikipedia", source_url: "#" },
  { id: 9,  genre: "エンタメ・芸術・スポーツ",  title: "モナ・リザには眉毛がない",               summary: "ルーヴル美術館所蔵の「モナ・リザ」には眉毛と睫毛が描かれていません。当時のフィレンツェでは眉毛を剃るのが流行していたため意図的に省いたという説や、長年の修復で消えたという説があります。", source_title: "Wikipedia", source_url: "#" },
  { id: 10, genre: "サブカル・マニアック",      title: "「ゴリラ」はポルトガル語が語源",          summary: "「ゴリラ」という名前は紀元前5世紀のカルタゴの航海者ハンノが残した記録に登場する「Gorillai」に由来します。これがポルトガル語を経て英語に入り、1847年に学術的に記載された際に使われました。", source_title: "Wikipedia", source_url: "#" },
];

const SPREAD_DEG = 7;
const DRAG_THRESHOLD = 30;

type DealPhase = "idle" | "stacked" | "fanning";

export default function SwipePage() {
  const [activeIndex, setActiveIndex]     = useState(0);
  const [bookmarked, setBookmarked]       = useState<number[]>([]);
  const [toast, setToast]                 = useState("");
  const [bookmarkFlyIdx, setBookmarkFlyIdx] = useState<number | null>(null);
  const [dealPhase, setDealPhase]         = useState<DealPhase>("idle");
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const isAnimating   = useRef(false);

  const total   = MOCK_TRIVIA.length;
  const trivia  = MOCK_TRIVIA[activeIndex];
  const isBookmarked = bookmarked.includes(trivia.id);

  // 10枚使い切ったらカードをシュシュッと補充する
  // フェーズ: stacked（全カード重ねる）→ fanning（順にファンアウト）→ idle
  // TODO: ここで POST /trivia/generate を呼んでカードリストを差し替える
  const dealNewCards = useCallback(() => {
    isAnimating.current = true;
    setActiveIndex(0);
    setDealPhase("stacked");
    setTimeout(() => setDealPhase("fanning"), 80);
    setTimeout(() => {
      setDealPhase("idle");
      isAnimating.current = false;
    }, 80 + total * 70 + 400);
  }, [total]);

  // 右スワイプ / → キー: activeIndex を増やして次のカードへ
  const goLeft = useCallback(() => {
    if (isAnimating.current) return;
    if (activeIndex >= total - 1) {
      dealNewCards();
    } else {
      setActiveIndex((i) => i + 1);
    }
  }, [activeIndex, total, dealNewCards]);

  // 左スワイプ / ← キー: activeIndex を減らして前のカードへ
  const goRight = useCallback(() => {
    if (isAnimating.current) return;
    setActiveIndex((i) => Math.max(i - 1, 0));
  }, []);

  // 上スワイプ / ↑キー / ブックマークボタン: カードが上にシュッと飛んでから次のカードへ
  // TODO: POST /bookmarks に差し替え。未ログイン時はログイン誘導モーダルを表示
  const addBookmark = useCallback(() => {
    if (isAnimating.current || bookmarked.includes(trivia.id)) return;
    isAnimating.current = true;
    setBookmarked((prev) => [...prev, trivia.id]);
    setBookmarkFlyIdx(activeIndex);
    setToast("ブックマークしました");
    setTimeout(() => setToast(""), 1500);
    setTimeout(() => {
      setBookmarkFlyIdx(null);
      isAnimating.current = false;
      if (activeIndex >= total - 1) {
        dealNewCards();
      } else {
        setActiveIndex((i) => i + 1);
      }
    }, 370);
  }, [activeIndex, bookmarked, trivia.id, total, dealNewCards]);

  // キーボード
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goLeft();
      else if (e.key === "ArrowLeft")  goRight();
      else if (e.key === "ArrowUp")    addBookmark();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goLeft, goRight, addBookmark]);

  // ポインターイベント（<main> 全体にアタッチして画面どこでもスワイプ可能）
  // dx: 横移動量、dy: 縦移動量。縦優勢かつ上方向なら上スワイプ判定
  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (isAnimating.current) return;
    pointerStart.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (pointerStart.current === null) return;
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    pointerStart.current = null;
    // 上スワイプ: ブックマーク
    if (dy < -DRAG_THRESHOLD && Math.abs(dy) > Math.abs(dx)) {
      addBookmark();
    } else if (dx < -DRAG_THRESHOLD) {
      goLeft();
    } else if (dx > DRAG_THRESHOLD) {
      goRight();
    }
  };
  const onPointerCancel = () => {
    pointerStart.current = null;
  };

  // カードごとのスタイル計算（ファン配置・各種アニメーション）
  // transformOrigin "50% 480%" = カード下方480%の点を中心に回転 → 半円の半径を決める値
  const getCardStyle = (i: number): CSSProperties => {
    const angle = (i - activeIndex) * SPREAD_DEG;
    const isActive = i === activeIndex;
    const origin   = "50% 480%"; // 半円の半径（大きいほど緩やかな弧）

    // ブックマーク時: 上に飛ぶ
    if (bookmarkFlyIdx === i) {
      return {
        transformOrigin: origin,
        transform: "rotate(0deg) translateY(-280px)",
        opacity: 0,
        transition: "transform 0.35s cubic-bezier(0.4, 0, 0.6, 1), opacity 0.35s ease",
        zIndex: 30,
      };
    }

    // ドロー中: 全カードを重ねる（即座・トランジションなし）
    if (dealPhase === "stacked") {
      return {
        transformOrigin: origin,
        transform: "rotate(0deg)",
        opacity: 1,
        transition: "none",
        zIndex: i,
      };
    }

    // ドロー後: 順番にファンアウト
    if (dealPhase === "fanning") {
      return {
        transformOrigin: origin,
        transform: `rotate(${angle}deg)${isActive ? " scale(1.12) translateY(-16px)" : ""}`,
        opacity: 1,
        transition: `transform 0.42s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 65}ms`,
        zIndex: isActive ? 20 : 10 - Math.abs(i - activeIndex),
      };
    }

    // 通常（ドラッグ中はトランジション無効にしてバネが暴れるのを防ぐ）
    return {
      transformOrigin: origin,
      transform: `rotate(${angle}deg)${isActive ? " scale(1.12) translateY(-16px)" : ""}`,
      opacity: 1,
      transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
      zIndex: isActive ? 20 : 10 - Math.abs(i - activeIndex),
    };
  };

  return (
    <main
      className="flex min-h-screen flex-col bg-gradient-to-b from-slate-900 to-slate-800 overflow-hidden select-none touch-none"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >

      {/* ヘッダー */}
      <div className="flex items-center justify-between px-6 pt-10 pb-4">
        <span className="text-sm font-mono text-slate-400">{activeIndex + 1} / {total}</span>
        <Link href="/mypage" className="text-sm text-slate-400 hover:text-white transition-colors">
          マイページ
        </Link>
      </div>

      {/* トースト */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs px-4 py-2 rounded-full z-50 pointer-events-none">
          {toast}
        </div>
      )}

      {/* アクティブカードのコンテンツ */}
      <div className="flex-1 px-6 py-2">
        <div className="h-full rounded-2xl bg-white/5 border border-white/10 p-6 text-white flex flex-col">
          <div className="flex items-start justify-between mb-3">
            {/* TODO: trivia.genre */}
            <span className="text-xs font-medium text-blue-400 bg-blue-400/10 px-2.5 py-1 rounded-full">
              {trivia.genre}
            </span>
            {isBookmarked && <span className="text-yellow-400 text-sm">★</span>}
          </div>
          {/* TODO: trivia.title */}
          <h2 className="text-xl font-bold leading-snug mb-4">{trivia.title}</h2>
          {/* TODO: trivia.summary */}
          <p className="text-sm text-slate-300 leading-relaxed flex-1">{trivia.summary}</p>
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
            {/* TODO: trivia.source_title / source_url */}
            <span className="text-xs text-slate-500">出典: {trivia.source_title}</span>
            <button
              onClick={addBookmark}
              disabled={isBookmarked}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                isBookmarked
                  ? "border-yellow-500/40 text-yellow-400"
                  : "border-white/20 text-slate-400 hover:border-white/40 hover:text-white"
              }`}
            >
              {isBookmarked ? "★ 保存済み" : "☆ ブックマーク"}
            </button>
          </div>
        </div>
      </div>

      {/* カードファン */}
      <div
        className="relative h-56"
      >
        {MOCK_TRIVIA.map((t, i) => (
          <button
            key={t.id}
            className="absolute left-1/2 bottom-6 w-28 h-44 -translate-x-1/2 focus:outline-none"
            style={getCardStyle(i)}
            onClick={() => !isAnimating.current && setActiveIndex(i)}
          >
            <div
              className={`w-full h-full rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-colors duration-300 ${
                i === activeIndex
                  ? "bg-white text-slate-900 border-white shadow-[0_0_32px_rgba(255,255,255,0.18)]"
                  : "bg-slate-700/80 text-slate-400 border-slate-600/50"
              }`}
            >
              <span className="text-lg font-bold">{i + 1}</span>
              <span className="text-[9px] px-2 text-center leading-tight opacity-60 line-clamp-3">
                {t.title.slice(0, 12)}…
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* 操作ヒント */}
      <p className="text-center text-xs text-slate-600 py-4">
        左右ドラッグ・左右キー・カードタップで移動　↑キーでブックマーク
      </p>
    </main>
  );
}
