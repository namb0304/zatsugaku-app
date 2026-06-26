"use client";

// 接続: GET /bookmarks でログインユーザーのブックマーク一覧を取得
//   - レスポンス: [{ id, trivia: { title, summary, genre, source_title, source_url }, created_at }]
// 接続: ブックマーク削除 → DELETE /bookmarks/{trivia_id}
// 注意: このページはログインが必須。未ログイン時は /login へリダイレクト（middleware.ts で対応予定）

import Link from "next/link";
import { useBookmarks } from "@/hooks/useBookmarks";

export default function BookmarksPage() {
  const { bookmarks, loading, removeBookmark } = useBookmarks();

  return (
    <main className="flex min-h-screen flex-col bg-white px-6 py-8">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/swipe" className="text-gray-500 text-sm">
          ← 戻る
        </Link>
        <h1 className="text-lg font-bold">ブックマーク</h1>
      </div>

      {/* ローディング */}
      {loading && (
        <p className="text-sm text-gray-400">読み込み中...</p>
      )}

      {/* 空状態 */}
      {!loading && bookmarks.length === 0 && (
        <p className="text-center text-sm text-gray-400 mt-20">
          まだブックマークがありません
        </p>
      )}

      {/* 一覧 */}
      <div className="flex flex-col gap-4">
        {bookmarks.map((b) => (
          <div
            key={b.id}
            className="rounded-xl border border-gray-200 p-4 flex flex-col gap-2"
          >
            <span className="text-xs font-medium text-blue-500">
              {b.trivia.genre}
            </span>

            <p className="text-sm font-semibold">
              {b.trivia.title}
            </p>

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
    </main>
  );
}