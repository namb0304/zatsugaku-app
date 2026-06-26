"use client";

// 接続: Supabase Auth の getUser() でログイン中ユーザー情報を取得
// 接続: GET /me/preferences でユーザーの保存済みジャンルを取得して初期選択状態にする
// 接続: ジャンル変更時 → PUT /me/preferences で選択ジャンルを保存
// 接続: ログアウト → Supabase Auth の signOut() を呼んで /login へリダイレクト
// 注意: このページはログインが必須。未ログイン時は /login へリダイレクト（middleware.ts で対応予定）

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const GENRES = [
  "自然・科学・宇宙",
  "生き物",
  "人体・医学",
  "歴史・偉人",
  "言葉・語源",
  "食べ物・料理",
  "地理・世界の文化",
  "生活・日常の疑問",
  "エンタメ・芸術・スポーツ",
  "サブカル・マニアック",
];

export default function MyPage() {
  const router = useRouter();
  // TODO: GET /me/preferences で取得した選択済みジャンルで初期化する
  const [selected, setSelected] = useState<string[]>([]);

  // localStorage から選択ジャンルを読み込む（暫定。本番は API から取得）
  useEffect(() => {
    const saved = localStorage.getItem("selectedGenres");
    if (saved) setSelected(JSON.parse(saved));
  }, []);

  const toggle = (genre: string) => {
    const next = selected.includes(genre)
      ? selected.filter((g) => g !== genre)
      : [...selected, genre];
    setSelected(next);
    // TODO: PUT /me/preferences に差し替える
    localStorage.setItem("selectedGenres", JSON.stringify(next));
  };

  const handleLogout = () => {
    // TODO: Supabase Auth の signOut() に差し替える
    router.push("/login");
  };

  return (
    <main className="flex min-h-screen flex-col bg-white px-6 py-8">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/swipe" className="text-gray-500 text-sm">← 戻る</Link>
        <h1 className="text-lg font-bold">マイページ</h1>
      </div>

      {/* TODO: Supabase getUser() で取得したメールアドレスを表示 */}
      <div className="mb-8 rounded-xl bg-gray-50 p-4">
        <p className="text-sm text-gray-500">ログイン中</p>
        <p className="text-sm font-medium mt-1">example@email.com</p>
      </div>

      {/* ジャンル選択トグル */}
      <h2 className="text-sm font-bold mb-3">好きなジャンル</h2>
      <div className="flex flex-col gap-2 mb-8">
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
              {isSelected ? "✓ " : ""}{genre}
            </button>
          );
        })}
      </div>

      <Link
        href="/bookmarks"
        className="mb-4 rounded-lg border border-gray-300 py-3 text-center text-sm block"
      >
        ブックマーク一覧
      </Link>

      {/* TODO: Supabase signOut() に差し替える */}
      <button
        onClick={handleLogout}
        className="rounded-lg py-3 text-center text-sm text-red-500 hover:bg-red-50 transition-colors"
      >
        ログアウト
      </button>
    </main>
  );
}
