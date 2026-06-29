"use client";

import { useEffect, useState } from "react";
import { fetchBookmarks, removeBookmark as apiRemoveBookmark } from "@/lib/api";
import { authService } from "@/services/authService";

export type BookmarkTrivia = {
  id: string;
  title: string;
  summary: string;
  genre: string;
  source_title: string;
  source_url: string;
};

export type BookmarkItem = {
  id: string;
  trivia: BookmarkTrivia;
  created_at: string;
};

type BookmarkStatus = "loading" | "unauthenticated" | "error" | "ok";

export const useBookmarks = () => {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  // "loading" を初期値にしてエフェクト内の同期 setState を避ける
  const [status, setStatus] = useState<BookmarkStatus>("loading");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    authService.getAccessToken().then((token) => {
      if (cancelled) return;
      if (!token) {
        setStatus("unauthenticated");
        return;
      }
      fetchBookmarks(token)
        .then((items) => {
          if (cancelled) return;
          setBookmarks(items);
          setStatus("ok");
        })
        .catch(() => {
          if (!cancelled) setStatus("error");
        });
    });

    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  const removeBookmark = async (triviaId: string) => {
    const token = await authService.getAccessToken();
    if (!token) return;
    try {
      await apiRemoveBookmark(triviaId, token);
      setBookmarks((prev) => prev.filter((b) => b.trivia.id !== triviaId));
    } catch {
      setStatus("error");
    }
  };

  const refetch = () => {
    setStatus("loading");
    setRetryCount((n) => n + 1);
  };

  return {
    bookmarks,
    loading: status === "loading",
    status,
    removeBookmark,
    refetch,
  };
};
