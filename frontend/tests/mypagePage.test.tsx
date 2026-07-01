import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useRouter: vi.fn(() => ({ replace: vi.fn(), push: vi.fn() })),
}));

vi.mock("@/lib/api", () => ({
  fetchBookmarks: vi.fn(),
  removeBookmark: vi.fn(),
  fetchPreferences: vi.fn(),
  savePreferences: vi.fn(),
}));

vi.mock("@/services/authService", () => ({
  authService: {
    getUser: vi.fn().mockResolvedValue({ email: "test@example.com" }),
    getAccessToken: vi.fn().mockResolvedValue("mock-token"),
    signOut: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/services/genreService", () => ({
  genreService: {
    getLocal: vi.fn().mockReturnValue([]),
    saveLocal: vi.fn(),
    getRemote: vi.fn().mockResolvedValue([]),
    saveRemote: vi.fn().mockResolvedValue(undefined),
  },
}));

import * as api from "@/lib/api";
import MyPage from "@/app/mypage/page";

type BookmarkTrivia = {
  id: string;
  title: string;
  summary: string;
  genre: string;
  source_title: string;
  source_url: string;
};
type BookmarkItem = {
  id: string;
  trivia: BookmarkTrivia;
  created_at: string;
};

function makeBookmarks(count: number): BookmarkItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `bm-${i}`,
    trivia: {
      id: `trivia-${i}`,
      title: `タイトル ${i}`,
      summary: `概要 ${i}`,
      genre: "自然・科学・宇宙",
      source_title: `Wikipedia ${i}`,
      source_url: `https://ja.wikipedia.org/wiki/${i}`,
    },
    created_at: "2026-01-01T00:00:00Z",
  }));
}

describe("マイページ: タブ切り替え", () => {
  const mockFetchBookmarks = vi.mocked(api.fetchBookmarks);

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchBookmarks.mockReset();
    mockFetchBookmarks.mockResolvedValue(makeBookmarks(3));
  });

  it("初期表示はジャンルタブ", async () => {
    render(<MyPage />);
    await waitFor(() =>
      expect(screen.getByText("好きなジャンル")).toBeInTheDocument(),
    );
    expect(screen.queryByText("タイトル 0")).not.toBeInTheDocument();
  });

  it("ブックマークタブに切り替えると一覧が表示される", async () => {
    render(<MyPage />);
    fireEvent.click(screen.getByRole("tab", { name: "ブックマーク" }));
    await waitFor(() =>
      expect(screen.getByText("タイトル 0")).toBeInTheDocument(),
    );
  });

  it("ジャンルタブに戻るとジャンル一覧が再表示される", async () => {
    render(<MyPage />);
    fireEvent.click(screen.getByRole("tab", { name: "ブックマーク" }));
    fireEvent.click(screen.getByRole("tab", { name: "ジャンル" }));
    await waitFor(() =>
      expect(screen.getByText("好きなジャンル")).toBeInTheDocument(),
    );
  });
});

describe("マイページ: ブックマーク一覧", () => {
  const mockFetchBookmarks = vi.mocked(api.fetchBookmarks);
  const mockRemoveBookmark = vi.mocked(api.removeBookmark);

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchBookmarks.mockReset();
    mockRemoveBookmark.mockReset();
  });

  it("タイトル・概要・ジャンルを表示する", async () => {
    mockFetchBookmarks.mockResolvedValue(makeBookmarks(2));
    render(<MyPage />);
    fireEvent.click(screen.getByRole("tab", { name: "ブックマーク" }));
    await waitFor(() =>
      expect(screen.getByText("タイトル 0")).toBeInTheDocument(),
    );
    expect(screen.getByText("概要 0")).toBeInTheDocument();
    // ジャンルは複数ブックマークに同じ値が出るため getAllByText で確認
    expect(screen.getAllByText("自然・科学・宇宙").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("タイトル 1")).toBeInTheDocument();
  });

  it("情報源リンクの href・target・rel が正しい", async () => {
    mockFetchBookmarks.mockResolvedValue(makeBookmarks(1));
    render(<MyPage />);
    fireEvent.click(screen.getByRole("tab", { name: "ブックマーク" }));
    const link = await screen.findByRole("link", { name: "Wikipedia 0" });
    expect(link).toHaveAttribute("href", "https://ja.wikipedia.org/wiki/0");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("削除ボタンを押すとブックマークが消える", async () => {
    mockFetchBookmarks.mockResolvedValue(makeBookmarks(2));
    mockRemoveBookmark.mockResolvedValue(undefined);
    render(<MyPage />);
    fireEvent.click(screen.getByRole("tab", { name: "ブックマーク" }));
    await waitFor(() =>
      expect(screen.getByText("タイトル 0")).toBeInTheDocument(),
    );
    const deleteButtons = screen.getAllByRole("button", { name: "削除" });
    fireEvent.click(deleteButtons[0]);
    await waitFor(() =>
      expect(screen.queryByText("タイトル 0")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("タイトル 1")).toBeInTheDocument();
  });

  it("空状態を表示する", async () => {
    mockFetchBookmarks.mockResolvedValue([]);
    render(<MyPage />);
    fireEvent.click(screen.getByRole("tab", { name: "ブックマーク" }));
    await waitFor(() =>
      expect(
        screen.getByText("まだブックマークがありません"),
      ).toBeInTheDocument(),
    );
  });

  it("エラー時に再試行ボタンが表示される", async () => {
    mockFetchBookmarks.mockRejectedValue(new Error("500"));
    render(<MyPage />);
    fireEvent.click(screen.getByRole("tab", { name: "ブックマーク" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "再試行" }),
      ).toBeInTheDocument(),
    );
  });
});
