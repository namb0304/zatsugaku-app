"use client";

import { useState } from "react";
import { genreService } from "@/services/genreService";
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

export const useGenre = () => {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (genre: string) => {
    setSelected((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : [...prev, genre]
    );
  };

  const start = async () => {
    // local保存（今はこれがデフォ）
    genreService.saveLocal(selected);

    // TODO: ログイン時は genreService.saveRemote(selected)

    router.push("/swipe");
  };

  return {
    GENRES,
    selected,
    toggle,
    start,
  };
};