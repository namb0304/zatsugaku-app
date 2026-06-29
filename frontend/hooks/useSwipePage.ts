"use client";

import { useCallback, useRef, useState } from "react";

const SPREAD_DEG = 7;
const DRAG_THRESHOLD = 30;

export const useSwipePage = (total: number) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [bookmarked, setBookmarked] = useState<(number | string)[]>([]);
  const [toast, setToast] = useState("");
  const [bookmarkFlyIdx, setBookmarkFlyIdx] = useState<number | null>(null);
  const [dealPhase, setDealPhase] = useState<"idle" | "stacked" | "fanning">("idle");

  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const isAnimating = useRef(false);

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

  const goNext = useCallback(() => {
    if (isAnimating.current) return;

    if (activeIndex >= total - 1) {
      dealNewCards();
    } else {
      setActiveIndex((i) => i + 1);
    }
  }, [activeIndex, total, dealNewCards]);

  const goPrev = useCallback(() => {
    if (isAnimating.current) return;
    setActiveIndex((i) => Math.max(i - 1, 0));
  }, []);

  const addBookmark = useCallback((id: number | string) => {
    if (isAnimating.current || bookmarked.includes(id)) return;

    isAnimating.current = true;

    setBookmarked((prev) => [...prev, id]);
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
  }, [activeIndex, bookmarked, total, dealNewCards]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (isAnimating.current) return;
    pointerStart.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!pointerStart.current) return;

    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    pointerStart.current = null;

    if (dy < -DRAG_THRESHOLD && Math.abs(dy) > Math.abs(dx)) {
      return "bookmark";
    }
    if (dx < -DRAG_THRESHOLD) return "next";
    if (dx > DRAG_THRESHOLD) return "prev";

    return null;
  };

  const getCardStyle = (i: number) => {
    const angle = (i - activeIndex) * SPREAD_DEG;
    const isActive = i === activeIndex;
    if (bookmarkFlyIdx === i) {
      return {
        transform: "rotate(0deg) translateY(-280px)",
        opacity: 0,
        transition: "0.35s",
      };
    }

    if (dealPhase === "stacked") {
      return { transform: "rotate(0deg)", transition: "none" };
    }

    if (dealPhase === "fanning") {
      return {
        transform: `rotate(${angle}deg)${isActive ? " scale(1.12) translateY(-16px)" : ""}`,
        transition: `0.42s ${i * 60}ms`,
      };
    }

    return {
      transform: `rotate(${angle}deg)${isActive ? " scale(1.12)" : ""}`,
    };
  };

  return {
    activeIndex,
    bookmarked,
    toast,
    bookmarkFlyIdx,
    dealPhase,
    isAnimating,
    dealNewCards,
    goNext,
    goPrev,
    addBookmark,
    onPointerDown,
    onPointerUp,
    getCardStyle,
  };
};