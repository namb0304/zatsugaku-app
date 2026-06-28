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

  // 初期ロード
  useEffect(() => {
    const init = async () => {
      const user = await authService.getUser();
      if (user?.email) setUserEmail(user.email);

      // まずlocal（暫定）
      const local = genreService.getLocal();
      setSelected(local);
    };

    init();
  }, []);

  const toggle = async (genre: string) => {
    const next = selected.includes(genre)
      ? selected.filter((g) => g !== genre)
      : [...selected, genre];

    setSelected(next);

    // local保存（現状）
    genreService.saveLocal(next);

    // TODO: ログイン時は genreService.saveRemote(next)
  };

  const logout = async () => {
    await authService.signOut();
    router.push("/login");
  };

  return {
    GENRES,
    userEmail,
    selected,
    toggle,
    logout,
  };
};