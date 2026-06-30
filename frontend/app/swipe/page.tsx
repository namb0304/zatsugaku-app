"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { addBookmark, fetchTriviaFeed, postViewHistory } from "@/lib/api";
import { authService } from "@/services/authService";
import {
  getViewedIds,
  markViewed,
  prioritizeUnviewed,
} from "@/lib/viewHistory";
import { shuffle } from "@/lib/swipeUtils";
import type { TriviaItem } from "@/types/trivia";

const CENTER = 4.5;
type FeedStatus = "loading" | "error" | "empty" | "ok";

export default function SwipePage() {
  // ── データ ──────────────────────────────────────────────────────────
  const [cards, setCards] = useState<TriviaItem[]>([]);
  const [feedStatus, setFeedStatus] = useState<FeedStatus>("loading");
  const [retryCount, setRetryCount] = useState(0);
  const [fetchingNext, setFetchingNext] = useState(false);
  const [nextError, setNextError] = useState(false);

  // ── UI 状態 ──────────────────────────────────────────────────────────
  const [activeIndex, setActiveIndex] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const activeRef = useRef<TriviaItem | undefined>(undefined);

  // 最後のカードID・現在のインデックス・カード一覧を refs で持ち stale closure を防ぐ
  const lastCardIdRef = useRef<string | null>(null);
  const activeIndexRef = useRef(0);
  const cardsRef = useRef<TriviaItem[]>([]);
  const fetchingNextRef = useRef(false);

  // ── フィード取得（retryCount が変わるたびに再実行） ─────────────────
  useEffect(() => {
    let cancelled = false;

    fetchTriviaFeed()
      .then((items) => {
        if (cancelled) return;
        setCards(prioritizeUnviewed(shuffle(items), getViewedIds()));
        setActiveIndex(0);
        setFeedStatus(items.length > 0 ? "ok" : "empty");
      })
      .catch(() => {
        if (!cancelled) setFeedStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  const active = cards[activeIndex];

  // refs を最新状態に同期する
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
    cardsRef.current = cards;
  }, [activeIndex, cards]);

  // ── 視聴履歴（ゲスト: localStorage / ログイン: API） ─────────────────
  useEffect(() => {
    if (!active) return;

    authService.getAccessToken().then((token) => {
      if (token) {
        postViewHistory(active.id, token).catch(() => {});
      } else {
        markViewed(active.id);
      }
    });
  }, [active]);

  // ── 次バッチ取得 ──────────────────────────────────────────────────────
  const loadNextBatch = useCallback(() => {
    if (fetchingNextRef.current) return;
    fetchingNextRef.current = true;
    setFetchingNext(true);
    setNextError(false);

    const prevLastId = lastCardIdRef.current;

    fetchTriviaFeed()
      .then((items) => {
        if (items.length === 0) {
          throw new Error("Next trivia batch is empty");
        }
        const arranged = prioritizeUnviewed(shuffle(items), getViewedIds());
        // 前バッチの最後と同じ雑学が先頭にならないよう調整
        if (prevLastId && arranged.length > 1 && arranged[0].id === prevLastId) {
          const idx = arranged.findIndex((it) => it.id !== prevLastId);
          if (idx > 0) {
            [arranged[0], arranged[idx]] = [arranged[idx], arranged[0]];
          }
        }
        setCards(arranged);
        setActiveIndex(0);
        setFetchingNext(false);
        fetchingNextRef.current = false;
      })
      .catch(() => {
        setFetchingNext(false);
        setNextError(true);
        fetchingNextRef.current = false;
      });
  }, []);

  // ── ナビ ─────────────────────────────────────────────────────────────
  const next = useCallback(() => {
    const idx = activeIndexRef.current;
    const t = cardsRef.current.length;
    if (t === 0) return;
    if (idx < t - 1) {
      setActiveIndex((i) => Math.min(i + 1, t - 1));
      return;
    }
    // 最後のカード → 次バッチ取得
    lastCardIdRef.current = cardsRef.current[t - 1]?.id ?? null;
    loadNextBatch();
  }, [loadNextBatch]);

  const prev = useCallback(() => {
    setActiveIndex((i) => Math.max(i - 1, 0));
  }, []);

  // ── ブックマーク ─────────────────────────────────────────────────────
  const handleBookmark = useCallback(async () => {
    const item = activeRef.current;
    if (!item) return;

    const token = await authService.getAccessToken();
    if (!token) {
      setToast("ブックマークするにはログインが必要です");
      setTimeout(() => setToast(null), 2500);
      return;
    }

    try {
      await addBookmark(item.id, token);
      setToast("ブックマークしました");
    } catch {
      setToast("ブックマークに失敗しました");
    }
    setTimeout(() => setToast(null), 2000);
  }, []);

  // ── 初回取得リトライ ─────────────────────────────────────────────────
  const retryInitial = () => {
    setFeedStatus("loading");
    setRetryCount((n) => n + 1);
  };

  // ── ポインター ────────────────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent) => {
    pointer.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!pointer.current) return;
    const dx = e.clientX - pointer.current.x;
    const dy = e.clientY - pointer.current.y;
    pointer.current = null;

    if (dy < -60 && Math.abs(dy) > Math.abs(dx)) {
      handleBookmark();
      return;
    }
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < -40) next();
      if (dx > 40) prev();
    }
  };

  // ── キーボード ────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowUp") handleBookmark();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, handleBookmark]);

  // ── マウスホバーでカード選択 ───────────────────────────────────────────
  const onMouseMove = (e: React.MouseEvent) => {
    const { clientX: x, clientY: y } = e;
    let hitIndex = -1;
    let hitZ = -Infinity;

    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
      ) {
        const z = Number(el.dataset.z ?? "0");
        if (z > hitZ) {
          hitZ = z;
          hitIndex = i;
        }
      }
    });

    if (hitIndex !== -1) setActiveIndex(hitIndex);
  };

  // ── ローディング ───────────────────────────────────────────────────────
  if (feedStatus === "loading") {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white flex items-center justify-center">
        <p className="text-slate-400 text-sm animate-pulse">読み込み中…</p>
      </main>
    );
  }

  // ── エラー / 空 ────────────────────────────────────────────────────────
  if (feedStatus === "error" || feedStatus === "empty" || cards.length === 0) {
    const message =
      feedStatus === "empty"
        ? "表示できる雑学がありません"
        : "雑学の読み込みに失敗しました";
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col items-center justify-center gap-4">
        <p className="text-slate-300 text-sm">{message}</p>
        <button
          onClick={retryInitial}
          className="bg-white/10 hover:bg-white/20 text-white text-sm px-5 py-2 rounded-lg border border-white/20"
        >
          再試行
        </button>
      </main>
    );
  }

  const total = cards.length;

  // ── メイン ─────────────────────────────────────────────────────────────
  return (
    <main
      className="relative min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white overflow-hidden touch-none select-none"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        pointer.current = null;
      }}
    >
      {/* トースト */}
      {toast && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm z-50">
          {toast}
        </div>
      )}

      {/* ヘッダー（更新ボタンを削除、次バッチ取得中のインジケーターを追加） */}
      <div className="absolute top-6 left-0 right-0 px-6 flex justify-between items-center z-50">
        <Link href="/mypage" className="text-xs text-slate-300">
          マイページ
        </Link>
        {fetchingNext && (
          <span className="text-xs text-slate-400 animate-pulse">読み込み中…</span>
        )}
        {nextError && !fetchingNext && (
          <button
            onClick={loadNextBatch}
            className="text-xs text-slate-400 underline"
          >
            再試行
          </button>
        )}
      </div>

      {/* 背景コンテンツ */}
      <div className="absolute inset-0 flex items-start justify-center px-8 pt-35">
        <div className="text-center max-w-xl">
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full bg-blue-400/10 px-2.5 py-1 text-xs font-medium text-blue-300">
              {active.genre}
            </span>
            {active.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-400"
              >
                {tag}
              </span>
            ))}
          </div>
          <h1 className="text-6xl sm:text-4xl font-bold mb-4">
            {active.title}
          </h1>
          <p className="text-slate-300 text-sm sm:text-base">{active.summary}</p>
          <a
            href={active.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-500 hover:text-slate-300 underline mt-3 inline-block"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            出典: {active.source_title}
          </a>
        </div>
      </div>

      {/* カウンター */}
      <div className="relative flex justify-center px-6 pt-10">
        <span className="text-xs text-slate-400">
          {activeIndex + 1} / {total}
        </span>
      </div>

      {/* カード fan（既存レイアウト維持） */}
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

      <div className="absolute bottom-3 w-full text-center text-xs text-slate-500">
        PC：左右キー・マウスドラッグ・クリックでカード選択 / 上キー・上にドラッグでブックマーク
        <br />
        スマホ：タップでカード選択 / 上にスワイプでブックマーク
      </div>
    </main>
  );
}
