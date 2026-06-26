// 接続: GET /bookmarks でログインユーザーのブックマーク一覧を取得
//   - レスポンス: [{ id, trivia: { title, summary, genre, source_title, source_url }, created_at }]
// 接続: ブックマーク削除 → DELETE /bookmarks/{trivia_id}
// 注意: このページはログインが必須。未ログイン時は /login へリダイレクト（middleware.ts で対応予定）

import Link from "next/link";

export default function BookmarksPage() {
  return (
    <main className="flex min-h-screen flex-col bg-white px-6 py-8">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/swipe" className="text-gray-500 text-sm">
          ← 戻る
        </Link>
        <h1 className="text-lg font-bold">ブックマーク</h1>
      </div>

      {/* TODO: GET /bookmarks のレスポンスを map してカード表示 */}
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-gray-200 p-4 flex flex-col gap-2">
            {/* TODO: bookmark.trivia.genre */}
            <span className="text-xs font-medium text-blue-500">ジャンル</span>
            {/* TODO: bookmark.trivia.title */}
            <p className="text-sm font-semibold">ブックマークした雑学のタイトル {i}</p>
            {/* TODO: bookmark.trivia.summary */}
            <p className="text-xs text-gray-500 line-clamp-2">
              ここに概要が表示されます。タップすると詳細が見られます。
            </p>
            {/* TODO: 削除ボタン → DELETE /bookmarks/{trivia_id} */}
          </div>
        ))}
      </div>

      {/* TODO: 取得結果が空配列のときに表示 */}
      {/* <p className="text-center text-sm text-gray-400 mt-20">まだブックマークがありません</p> */}
    </main>
  );
}
