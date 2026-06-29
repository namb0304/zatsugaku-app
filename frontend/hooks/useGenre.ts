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

export const useGenre = () => {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);

  // ログイン時はAPIから初期値を取得する
  useEffect(() => {
    const init = async () => {
      const token = await authService.getAccessToken();
      if (token) {
        try {
          const remote = await genreService.getRemote(token);
          setSelected(remote);
          genreService.saveLocal(remote);
          return;
        } catch {
          // API失敗はlocalStorageにフォールバック
        }
      }
      setSelected(genreService.getLocal());
    };
    init();
  }, []);

  const toggle = (genre: string) => {
    setSelected((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre],
    );
  };

  const start = async () => {
    genreService.saveLocal(selected);

    const token = await authService.getAccessToken();
    if (token) {
      try {
        await genreService.saveRemote(selected, token);
      } catch {
        // 保存失敗してもswipeへ進む
      }
    }

    router.push("/swipe");
  };

  return {
    GENRES,
    selected,
    toggle,
    start,
  };
};
