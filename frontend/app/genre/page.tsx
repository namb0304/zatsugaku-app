"use client";

// 接続（ログインユーザーのみ）: 選択したジャンルを PUT /me/preferences で保存
//   - 未ログイン時は localStorage に保存してパーソナライズに使う
// 接続: 「はじめる」押下時に /swipe へ遷移（選択ジャンルをクエリや Context で渡す）
// TODO: ログインユーザーの場合は GET /me/preferences で取得して初期選択状態にする

import { useState } from "react";
import { useRouter } from "next/navigation";

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

export default function GenrePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (genre: string) => {
    setSelected((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleStart = () => {
    // TODO: ログインユーザーなら PUT /me/preferences で保存
    localStorage.setItem("selectedGenres", JSON.stringify(selected));
    router.push("/swipe");
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-white px-6 py-12">
      <h1 className="text-xl font-bold mb-2">好きなジャンルを選ぼう</h1>
      <p className="text-sm text-gray-500 mb-8">複数選択できます</p>

      <div className="w-full max-w-sm flex flex-col gap-3 mb-10">
        {GENRES.map((genre) => {
          const isSelected = selected.includes(genre);
          return (
            <button
              key={genre}
              onClick={() => toggle(genre)}
              className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                isSelected
                  ? "border-black bg-black text-white"
                  : "border-gray-300 bg-white text-gray-800 hover:border-gray-500"
              }`}
            >
              {isSelected ? "✓ " : ""}{genre}
            </button>
          );
        })}
      </div>

      <button
        onClick={handleStart}
        className="w-full max-w-sm rounded-lg bg-black py-3 text-center text-sm font-medium text-white"
      >
        はじめる{selected.length > 0 ? `（${selected.length}件選択中）` : ""}
      </button>
    </main>
  );
}
