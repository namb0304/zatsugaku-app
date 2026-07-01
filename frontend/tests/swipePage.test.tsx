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
  generateTrivia: vi.fn(),
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

async function navigateToLastCard() {
  for (let i = 0; i < 9; i++) {
    act(() => {
      fireEvent.keyDown(document.body, { key: "ArrowRight" });
    });
  }
  await waitFor(() =>
    expect(screen.getByText("10 / 10")).toBeInTheDocument(),
  );
}

describe("スワイプページ: 自動次バッチ取得（フィードフォールバック）", () => {
  const mockFetch = vi.mocked(api.fetchTriviaFeed);
  const mockGenerate = vi.mocked(api.generateTrivia);

  beforeEach(() => {
    vi.clearAllMocks(); // call履歴をクリア（factory実装は保持）
    // キューも含めてリセット（前テストの未消費 once が残らないよう）
    mockFetch.mockReset();
    mockGenerate.mockReset();
  });

  it("最後のカードで次方向へ操作すると次の 10 件を自動取得する", async () => {
    mockFetch.mockResolvedValue(makeCards(10, "feed"));
    mockGenerate.mockResolvedValue(makeCards(10, "generated"));

    render(<SwipePage />);

    await waitFor(() =>
      expect(screen.queryByText("読み込み中…")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("1 / 10")).toBeInTheDocument();

    await navigateToLastCard();

    act(() => {
      fireEvent.keyDown(document.body, { key: "ArrowRight" });
    });

    // バッチ切り替え後はカウンターが "1 / 10" に戻る
    await waitFor(() =>
      expect(screen.getByText("1 / 10")).toBeInTheDocument(),
    );

    // フィード API は 1 回（初回のみ）
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("次バッチ取得失敗時は再試行ボタンが表示される", async () => {
    // 初回フィードは成功、generateTrivia と fallback fetchTriviaFeed は全呼び出し失敗
    mockFetch
      .mockResolvedValueOnce(makeCards(10, "first"))
      .mockRejectedValue(new Error("503"));
    mockGenerate.mockRejectedValue(new Error("403"));

    render(<SwipePage />);

    await waitFor(() =>
      expect(screen.queryByText("読み込み中…")).not.toBeInTheDocument(),
    );

    await navigateToLastCard();

    act(() => {
      fireEvent.keyDown(document.body, { key: "ArrowRight" });
    });

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "再試行" }),
      ).toBeInTheDocument(),
    );
  });

  it("次バッチが空でも現在のカードを維持して再試行できる", async () => {
    // generate 全失敗、fallback fetchTriviaFeed は空を返す
    mockFetch
      .mockResolvedValueOnce(makeCards(10, "first"))
      .mockResolvedValue([]);
    mockGenerate.mockRejectedValue(new Error("403"));

    render(<SwipePage />);

    await waitFor(() =>
      expect(screen.getByText("1 / 10")).toBeInTheDocument(),
    );

    await navigateToLastCard();

    act(() => {
      fireEvent.keyDown(document.body, { key: "ArrowRight" });
    });

    // 再試行ボタンが出現し、カウンターは 10/10 のまま
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "再試行" }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("10 / 10")).toBeInTheDocument();
  });
});

describe("スワイプページ: Gemini 先読み", () => {
  const mockFetch = vi.mocked(api.fetchTriviaFeed);
  const mockGenerate = vi.mocked(api.generateTrivia);

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockGenerate.mockReset();
  });

  it("初回表示後に生成 API が 1 回呼ばれる", async () => {
    mockFetch.mockResolvedValue(makeCards(10, "feed"));
    mockGenerate.mockResolvedValue(makeCards(10, "generated"));

    render(<SwipePage />);

    await waitFor(() =>
      expect(screen.getByText("1 / 10")).toBeInTheDocument(),
    );

    await waitFor(() => expect(mockGenerate).toHaveBeenCalledTimes(1));
  });

  it("先読み完了済みなら最後のカード後に即座に切り替わる", async () => {
    mockFetch.mockResolvedValue(makeCards(10, "feed"));
    mockGenerate.mockResolvedValue(makeCards(10, "generated"));

    render(<SwipePage />);

    await waitFor(() =>
      expect(screen.getByText("1 / 10")).toBeInTheDocument(),
    );

    // 先読み完了を待つ
    await waitFor(() => expect(mockGenerate).toHaveBeenCalledTimes(1));
    await act(async () => {}); // .then() が確実に実行される

    await navigateToLastCard();

    act(() => {
      fireEvent.keyDown(document.body, { key: "ArrowRight" });
    });

    await waitFor(() =>
      expect(screen.getByText("1 / 10")).toBeInTheDocument(),
    );

    // フィード API は 1 回だけ（初回のみ）
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("生成失敗時に GET /trivia/feed へフォールバックする", async () => {
    mockFetch.mockResolvedValue(makeCards(10, "feed"));
    mockGenerate.mockRejectedValue(new Error("403 permission denied"));

    render(<SwipePage />);

    await waitFor(() =>
      expect(screen.getByText("1 / 10")).toBeInTheDocument(),
    );

    // 先読みが試行される（generateTrivia 失敗 → fetchTriviaFeed フォールバック）
    await waitFor(() => expect(mockGenerate).toHaveBeenCalledTimes(1));
    await act(async () => {});

    // フォールバックとして fetchTriviaFeed が追加で呼ばれている
    expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("重複生成しない（isPrefetchingRef ガードが機能する）", async () => {
    let resolveGenerate!: (v: ReturnType<typeof makeCards>) => void;
    const pendingGenerate = new Promise<ReturnType<typeof makeCards>>(
      (resolve) => {
        resolveGenerate = resolve;
      },
    );

    mockFetch.mockResolvedValue(makeCards(10, "feed"));
    mockGenerate.mockReturnValue(pendingGenerate);

    render(<SwipePage />);

    await waitFor(() =>
      expect(screen.getByText("1 / 10")).toBeInTheDocument(),
    );

    // 先読み中に generateTrivia が 1 回だけ呼ばれていること
    await waitFor(() => expect(mockGenerate).toHaveBeenCalledTimes(1));

    // Promise 解決（クリーンアップ）
    resolveGenerate(makeCards(10, "generated"));
    await act(async () => {});

    // バッチ切り替え前なので次の先読みは始まらない
    expect(mockGenerate).toHaveBeenCalledTimes(1);
  });
});
