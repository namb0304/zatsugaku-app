"use client";

// 接続: Supabase Auth の signInWithPassword() を呼ぶ
//   - 成功 → /genre へ push
//   - 失敗 → エラーメッセージ表示
// 接続: 既にセッションがある場合は /genre へリダイレクト（middleware.ts で対応予定）

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    // TODO: Supabase Auth の signInWithPassword({ email, password }) に差し替える
    router.push("/genre");
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <h1 className="text-2xl font-bold mb-2">ログイン</h1>
      <p className="text-sm text-gray-500 mb-8">雑学アプリへようこそ</p>

      <div className="w-full max-w-sm flex flex-col gap-4">
        {/* TODO: value を Supabase Auth に渡す */}
        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
        />
        <input
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
        />
        <button
          onClick={handleLogin}
          className="w-full rounded-lg bg-black py-3 text-center text-sm font-medium text-white"
        >
          ログイン
        </button>
        {/* ログインせずに続ける: 認証不要。/genre へそのまま遷移 */}
        <Link href="/genre" className="text-center text-sm text-gray-500 underline">
          ログインせずに続ける
        </Link>
      </div>
    </main>
  );
}
