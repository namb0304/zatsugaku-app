"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/authService";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedUp, setSignedUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "login") {
        await authService.signIn(email, password);
        router.replace("/genre");
      } else {
        const data = await authService.signUp(email, password);
        if (data.session) {
          router.replace("/genre");
        } else {
          setSignedUp(true);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  if (signedUp) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
        <div className="w-full max-w-sm text-center">
          <p className="text-lg font-bold mb-2">確認メールを送信しました</p>
          <p className="text-sm text-gray-500 mb-6">
            メールのリンクを確認後、ログインしてください
          </p>
          <button
            onClick={() => {
              setMode("login");
              setSignedUp(false);
            }}
            className="text-sm text-blue-600 underline"
          >
            ログインへ戻る
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-bold mb-2 text-center">
          {mode === "login" ? "ログイン" : "新規登録"}
        </h1>
        <p className="text-sm text-gray-500 mb-8 text-center">
          ブックマークやジャンル設定を保存できます
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
          />
          <input
            type="password"
            placeholder="パスワード（6文字以上）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
          />

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "処理中..." : mode === "login" ? "ログイン" : "登録する"}
          </button>
        </form>

        <div className="mt-6 text-center">
          {mode === "login" ? (
            <button
              onClick={() => {
                setMode("signup");
                setError(null);
              }}
              className="text-sm text-gray-500 underline"
            >
              アカウントをお持ちでない方はこちら
            </button>
          ) : (
            <button
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className="text-sm text-gray-500 underline"
            >
              ログインへ戻る
            </button>
          )}
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => router.push("/swipe")}
            className="text-xs text-gray-400 underline"
          >
            ゲストとして続ける
          </button>
        </div>
      </div>
    </main>
  );
}
