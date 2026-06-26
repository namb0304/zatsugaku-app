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

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

const generateMockTrivia = () =>
  Array.from({ length: 10 }).map((_, i) => ({
    id: Date.now() + i,
    title: `雑学タイトル ${i + 1}`,
    summary: `これは新しく生成された雑学${i + 1}です。`,
  }));

const CENTER = 4.5;

export default function SwipePage() {
  const [cards, setCards] = useState(generateMockTrivia);
  const [activeIndex, setActiveIndex] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const pointer = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);

  const total = cards.length;
  const active = cards[activeIndex];

  // =========================
  // 更新
  // =========================
  const refreshCards = useCallback(() => {
    setCards(generateMockTrivia());
    setActiveIndex(0);
    setToast("カードを更新しました");
    setTimeout(() => setToast(null), 1500);
  }, []);

  // =========================
  // ナビ
  // =========================
  const next = useCallback(() => {
    setActiveIndex((i) => Math.min(i + 1, total - 1));
  }, [total]);

  const prev = useCallback(() => {
    setActiveIndex((i) => Math.max(i - 1, 0));
  }, []);

  // =========================
  // ブックマーク
  // =========================
  const addBookmark = useCallback(() => {
    const item = cards[activeIndex];
    console.log("bookmark:", item.id);

    setToast("ブックマークしました");
    setTimeout(() => setToast(null), 1500);
  }, [activeIndex, cards]);

  // =========================
  // Pointer（スマホ/PC統一）
  // =========================
  const onPointerDown = (e: React.PointerEvent) => {
    pointer.current = { x: e.clientX, y: e.clientY };
    isDragging.current = false;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointer.current) return;

    const dx = e.clientX - pointer.current.x;
    const dy = e.clientY - pointer.current.y;

    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      isDragging.current = true;
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!pointer.current) return;

    const dx = e.clientX - pointer.current.x;
    const dy = e.clientY - pointer.current.y;

    pointer.current = null;

    // 上スワイプ → ブックマーク
    if (dy < -60 && Math.abs(dy) > Math.abs(dx)) {
      addBookmark();
      return;
    }

    // 左右スワイプ
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < -40) next();
      if (dx > 40) prev();
      return;
    }

    // タップ（ドラッグしてない時だけ）
    if (!isDragging.current) {
      setActiveIndex(activeIndex);
    }
  };

  // =========================
  // キー操作
  // =========================
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowUp") addBookmark();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, addBookmark]);

  // =========================
  // カーソル選択
  // =========================
  const onMouseMove = (e: React.MouseEvent) => {
    const x = e.clientX;
    const y = e.clientY;

    let hitIndex = -1;
    let hitZ = -Infinity;

    cardRefs.current.forEach((el, i) => {
      if (!el) return;

      const rect = el.getBoundingClientRect();

      const inside =
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom;

      if (inside) {
        const z = Number(el.dataset.z ?? "0");

        if (z > hitZ) {
          hitZ = z;
          hitIndex = i;
        }
      }
    });

    if (hitIndex !== -1) {
      setActiveIndex(hitIndex);
    }
  };

  return (
    <main
      className="relative min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* トースト */}
      {toast && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm z-50">
          {toast}
        </div>
      )}

      {/* ヘッダー */}
      <div className="absolute top-6 left-0 right-0 px-6 flex justify-between items-center z-50">
        <Link href="/mypage" className="text-xs text-slate-300">
          マイページ
        </Link>

        <button
          onClick={refreshCards}
          className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-2 rounded-lg border border-white/20"
        >
          更新
        </button>
      </div>

      {/* 背景 */}
      <div className="absolute inset-0 flex items-center justify-center px-8">
        <div className="text-center max-w-xl">
          <h1 className="text-3xl font-bold mb-6">{active?.title}</h1>
          <p className="text-slate-300 text-sm">{active?.summary}</p>
        </div>
      </div>

      {/* カウンター */}
      <div className="relative flex justify-center px-6 pt-10">
        <span className="text-xs text-slate-400">
          {activeIndex + 1} / {total}
        </span>
      </div>

      {/* カード */}
      <div
        ref={containerRef}
        className="absolute bottom-24 left-0 right-0 flex justify-center"
        onMouseMove={onMouseMove}
      >
        <div className="relative w-full max-w-md h-48">
          {cards.map((card, i) => {
            const offset = i - CENTER;
            const abs = Math.abs(offset);

            const isActive = i === activeIndex;

            const spacing = 44;
            const x = offset * spacing;
            const y = Math.pow(abs, 1.5) * 3;
            const rotate = offset * 6;

            const scale = isActive ? 1.25 : 1;
            const zIndex = total - i;

            return (
              <button
                key={card.id}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                data-z={zIndex}
                onClick={() => setActiveIndex(i)}
                className="absolute left-1/2 bottom-0 bg-white text-slate-900 rounded-lg border border-gray-200 shadow-md"
                style={{
                  width: "72px",
                  height: "96px",
                  transformOrigin: "50% 100%",
                  transform: `
                    translateX(${x}px)
                    translateY(${y}px)
                    rotate(${rotate}deg)
                    scale(${scale})
                  `,
                  zIndex,
                }}
              >
                <div className="w-full h-full flex items-center justify-center px-1">
                  <span className="text-[11px] font-medium text-center leading-tight">
                    {card.title}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="absolute bottom-7 w-full text-center text-xs text-slate-500">
        ← → / mouse / swipe / ↑ bookmark / refresh
      </div>
    </main>
  );
}