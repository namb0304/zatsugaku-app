"use client";

import { useState } from "react";
import Link from "next/link";
import { useMyPage } from "@/hooks/useMyPage";
import { useBookmarks } from "@/hooks/useBookmarks";

type Tab = "genre" | "bookmarks";

export default function MyPage() {
  const [tab, setTab] = useState<Tab>("genre");
  const { GENRES, userEmail, selected, toggle, logout } = useMyPage();
  const { bookmarks, status, removeBookmark, refetch } = useBookmarks();

  return (
    <main className="flex min-h-screen flex-col bg-white">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
        <Link href="/swipe" className="text-gray-500 text-sm">
          ← 戻る
        </Link>
        <h1 className="text-lg font-bold">マイページ</h1>
      </div>

      {/* ユーザー情報 */}
      <div className="px-6 py-3 border-b border-gray-100">
        <p className="text-xs text-gray-400">
          ログイン中: {userEmail || "unknown"}
        </p>
      </div>

      {/* タブ */}
      <div
        role="tablist"
        aria-label="マイページ"
        className="flex border-b border-gray-200 px-4"
      >
        <button
          id="genre-tab"
          role="tab"
          aria-selected={tab === "genre"}
          aria-controls="genre-panel"
          onClick={() => setTab("genre")}
          className={`py-3 px-4 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === "genre"
              ? "border-black text-black"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          ジャンル
        </button>
        <button
          id="bookmarks-tab"
          role="tab"
          aria-selected={tab === "bookmarks"}
          aria-controls="bookmarks-panel"
          onClick={() => setTab("bookmarks")}
          className={`py-3 px-4 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === "bookmarks"
              ? "border-black text-black"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          ブックマーク
        </button>
      </div>

      {/* タブコンテンツ */}
      <div className="flex-1 px-6 py-6 overflow-y-auto">
        {tab === "genre" && (
          <div
            id="genre-panel"
            role="tabpanel"
            aria-labelledby="genre-tab"
          >
            <h2 className="text-sm font-bold mb-3">好きなジャンル</h2>
            <div className="flex flex-col gap-2">
              {GENRES.map((genre) => {
                const isSelected = selected.includes(genre);
                return (
                  <button
                    key={genre}
                    onClick={() => toggle(genre)}
                    className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                      isSelected
                        ? "border-black bg-black text-white"
                        : "border-gray-200 bg-white text-gray-800 hover:border-gray-400"
                    }`}
                  >
                    {isSelected ? "✓ " : ""}
                    {genre}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {tab === "bookmarks" && (
          <div
            id="bookmarks-panel"
            role="tabpanel"
            aria-labelledby="bookmarks-tab"
          >
            <BookmarkTab
              status={status}
              bookmarks={bookmarks}
              removeBookmark={removeBookmark}
              refetch={refetch}
            />
          </div>
        )}
      </div>

      {/* ログアウト */}
      <div className="px-6 pb-8 pt-2 border-t border-gray-100">
        <button
          onClick={logout}
          className="w-full rounded-lg py-3 text-center text-sm text-red-500 hover:bg-red-50 transition-colors"
        >
          ログアウト
        </button>
      </div>
    </main>
  );
}

// ── ブックマークタブ ────────────────────────────────────────────────────

type BookmarkTabProps = {
  status: ReturnType<typeof useBookmarks>["status"];
  bookmarks: ReturnType<typeof useBookmarks>["bookmarks"];
  removeBookmark: ReturnType<typeof useBookmarks>["removeBookmark"];
  refetch: ReturnType<typeof useBookmarks>["refetch"];
};

function BookmarkTab({
  status,
  bookmarks,
  removeBookmark,
  refetch,
}: BookmarkTabProps) {
  if (status === "loading") {
    return (
      <p className="text-sm text-gray-400 animate-pulse">読み込み中...</p>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center gap-3 mt-16 text-center">
        <p className="text-sm text-gray-500">
          ブックマークを見るにはログインが必要です
        </p>
        <Link
          href="/login"
          className="rounded-lg bg-black px-6 py-2 text-sm text-white"
        >
          ログイン
        </Link>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center gap-3 mt-16 text-center">
        <p className="text-sm text-red-400">読み込みに失敗しました</p>
        <button
          onClick={refetch}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
        >
          再試行
        </button>
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <p className="text-center text-sm text-gray-400 mt-16">
        まだブックマークがありません
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {bookmarks.map((b) => (
        <div
          key={b.id}
          className="rounded-xl border border-gray-200 p-4 flex flex-col gap-2"
        >
          <span className="text-xs font-medium text-blue-500">
            {b.trivia.genre}
          </span>

          <p className="text-sm font-semibold">{b.trivia.title}</p>

          <p className="text-xs text-gray-500 line-clamp-3">
            {b.trivia.summary}
          </p>

          <a
            href={b.trivia.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 underline hover:text-blue-600"
          >
            {b.trivia.source_title}
          </a>

          <button
            onClick={() => removeBookmark(b.trivia.id)}
            className="mt-1 self-start rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-colors"
          >
            削除
          </button>
        </div>
      ))}
    </div>
  );
}
