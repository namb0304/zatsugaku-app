"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/authService";
import { genreService } from "@/services/genreService";

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

export const useMyPage = () => {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState<string>("");
  const [selected, setSelected] = useState<string[]>([]);
  const [savingGenres, setSavingGenres] = useState(false);

  useEffect(() => {
    const init = async () => {
      const user = await authService.getUser();
      if (!user?.email) {
        router.replace("/login");
        return;
      }
      setUserEmail(user.email);

      const token = await authService.getAccessToken();
      if (token) {
        try {
          const remote = await genreService.getRemote(token);
          setSelected(remote);
          genreService.saveLocal(remote);
          return;
        } catch {
          // API失敗時はlocalStorageの値を使う
        }
      }
      setSelected(genreService.getLocal());
    };

    init();
  }, [router]);

  const toggle = async (genre: string) => {
    const next = selected.includes(genre)
      ? selected.filter((g) => g !== genre)
      : [...selected, genre];

    setSelected(next);
    genreService.saveLocal(next);

    const token = await authService.getAccessToken();
    if (!token) return;
    setSavingGenres(true);
    try {
      await genreService.saveRemote(next, token);
    } catch {
      // 保存失敗してもUIは維持する
    } finally {
      setSavingGenres(false);
    }
  };

  const logout = async () => {
    await authService.signOut();
    router.push("/login");
  };

  return {
    GENRES,
    userEmail,
    selected,
    savingGenres,
    toggle,
    logout,
  };
};
