"use client";

import Link from "next/link";
import { useBookmarks } from "@/hooks/useBookmarks";

export default function BookmarksPage() {
  const { bookmarks, status, removeBookmark, refetch } = useBookmarks();

  return (
    <main className="flex min-h-screen flex-col bg-white px-6 py-8">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/swipe" className="text-gray-500 text-sm">
          ← 戻る
        </Link>
        <h1 className="text-lg font-bold">ブックマーク</h1>
      </div>

      {/* 未認証 */}
      {status === "unauthenticated" && (
        <div className="flex flex-col items-center gap-3 mt-20 text-center">
          <p className="text-sm text-gray-500">ブックマークを見るにはログインが必要です</p>
          <Link
            href="/login"
            className="rounded-lg bg-black px-6 py-2 text-sm text-white"
          >
            ログイン
          </Link>
        </div>
      )}

      {/* ローディング */}
      {status === "loading" && (
        <p className="text-sm text-gray-400 animate-pulse">読み込み中...</p>
      )}

      {/* エラー */}
      {status === "error" && (
        <div className="mt-20 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-red-400">読み込みに失敗しました</p>
          <button
            onClick={refetch}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
          >
            再試行
          </button>
        </div>
      )}

      {/* 空状態 */}
      {status === "ok" && bookmarks.length === 0 && (
        <p className="text-center text-sm text-gray-400 mt-20">
          まだブックマークがありません
        </p>
      )}

      {/* 一覧 */}
      {status === "ok" && (
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

              <p className="text-xs text-gray-500 line-clamp-2">
                {b.trivia.summary}
              </p>

              <button
                onClick={() => removeBookmark(b.trivia.id)}
                className="text-xs text-red-500 mt-2 text-left"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
