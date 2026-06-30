import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useRouter: vi.fn(() => ({ replace: vi.fn(), push: vi.fn() })),
}));

vi.mock("@/lib/api", () => ({
  fetchTriviaFeed: vi.fn(),
  addBookmark: vi.fn(),
  postViewHistory: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/services/authService", () => ({
  authService: {
    getAccessToken: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("@/lib/viewHistory", () => ({
  getViewedIds: vi.fn().mockReturnValue([]),
  markViewed: vi.fn(),
  prioritizeUnviewed: vi.fn((items) => items),
}));

import * as api from "@/lib/api";
import SwipePage from "@/app/swipe/page";

function makeCards(count: number, prefix: string) {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i}`,
    title: `${prefix} タイトル ${i}`,
    summary: `概要 ${i}`,
    genre: "自然・科学・宇宙",
    tags: ["タグ1", "タグ2"],
    source_title: "Wikipedia",
    source_url: `https://ja.wikipedia.org/wiki/${prefix}${i}`,
  }));
}

describe("スワイプページ: 自動次バッチ取得", () => {
  const mockFetch = vi.mocked(api.fetchTriviaFeed);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("最後のカードで次方向へ操作すると次の 10 件を自動取得する", async () => {
    mockFetch
      .mockResolvedValueOnce(makeCards(10, "first"))
      .mockResolvedValueOnce(makeCards(10, "second"));

    render(<SwipePage />);

    // 初回ロード完了を待つ
    await waitFor(() => {
      expect(screen.queryByText("読み込み中…")).not.toBeInTheDocument();
    });

    // カウンターが表示されているか確認
    expect(screen.getByText("1 / 10")).toBeInTheDocument();

    // ArrowRight を 9 回押して最後のカードへ移動
    for (let i = 0; i < 9; i++) {
      act(() => {
        fireEvent.keyDown(document.body, { key: "ArrowRight" });
      });
    }

    // カウンターが 10 / 10 になるまで待つ（refs が更新されるのを待つ）
    await waitFor(() => {
      expect(screen.getByText("10 / 10")).toBeInTheDocument();
    });

    // 最後のカードでもう 1 回 ArrowRight → 次バッチ取得がトリガーされる
    act(() => {
      fireEvent.keyDown(document.body, { key: "ArrowRight" });
    });

    // fetchTriviaFeed が 2 回呼ばれたことを確認
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  it("次バッチ取得失敗時は再試行ボタンが表示される", async () => {
    mockFetch
      .mockResolvedValueOnce(makeCards(10, "first"))
      .mockRejectedValueOnce(new Error("network error"));

    render(<SwipePage />);

    await waitFor(() => {
      expect(screen.queryByText("読み込み中…")).not.toBeInTheDocument();
    });

    // 最後まで移動
    for (let i = 0; i < 9; i++) {
      act(() => {
        fireEvent.keyDown(document.body, { key: "ArrowRight" });
      });
    }

    await waitFor(() => {
      expect(screen.getByText("10 / 10")).toBeInTheDocument();
    });

    // 最後のカードで次へ → エラー
    act(() => {
      fireEvent.keyDown(document.body, { key: "ArrowRight" });
    });

    // 再試行ボタンが出現する
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "再試行" })).toBeInTheDocument();
    });
  });

  it("次バッチが空でも現在のカードを維持して再試行できる", async () => {
    mockFetch
      .mockResolvedValueOnce(makeCards(10, "first"))
      .mockResolvedValueOnce([]);

    render(<SwipePage />);

    await waitFor(() => {
      expect(screen.getByText("1 / 10")).toBeInTheDocument();
    });

    for (let i = 0; i < 9; i++) {
      act(() => {
        fireEvent.keyDown(document.body, { key: "ArrowRight" });
      });
    }

    await waitFor(() => {
      expect(screen.getByText("10 / 10")).toBeInTheDocument();
    });

    act(() => {
      fireEvent.keyDown(document.body, { key: "ArrowRight" });
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "再試行" })).toBeInTheDocument();
    });
    expect(screen.getByText("10 / 10")).toBeInTheDocument();
  });
});
