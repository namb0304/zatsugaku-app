import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

// next/navigation を先にモックする
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useRouter: vi.fn(),
}));

vi.mock("@/services/authService", () => ({
  authService: {
    getAccessToken: vi.fn(),
    signIn: vi.fn(),
    signUp: vi.fn(),
  },
}));

import { redirect, useRouter } from "next/navigation";
import { authService } from "@/services/authService";
import Home from "@/app/page";
import LoginPage from "@/app/login/page";

const mockRedirect = vi.mocked(redirect);
const mockUseRouter = vi.mocked(useRouter);
const mockAuthService = authService as {
  getAccessToken: ReturnType<typeof vi.fn>;
  signIn: ReturnType<typeof vi.fn>;
  signUp: ReturnType<typeof vi.fn>;
};

describe("/ → /swipe リダイレクト", () => {
  it("ルートにアクセスすると /swipe へリダイレクトされる", () => {
    render(<Home />);
    expect(mockRedirect).toHaveBeenCalledWith("/swipe");
  });
});

describe("ログインページの導線", () => {
  let mockReplace: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockReplace = vi.fn();
    mockUseRouter.mockReturnValue({
      replace: mockReplace,
      push: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as ReturnType<typeof useRouter>);
    // デフォルト: 未ログイン
    mockAuthService.getAccessToken.mockResolvedValue(null);
  });

  it("ログイン済みで /login を開くと /swipe へ遷移する", async () => {
    mockAuthService.getAccessToken.mockResolvedValue("existing-token");
    render(<LoginPage />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/swipe");
    });
  });

  it("ログイン成功後は /swipe へ遷移する", async () => {
    mockAuthService.signIn.mockResolvedValue({});
    render(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText("メールアドレス"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("パスワード（6文字以上）"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/swipe");
    });
  });

  it("新規登録でセッションがある場合は /genre へ遷移する", async () => {
    mockAuthService.signUp.mockResolvedValue({ session: { access_token: "token" } });
    render(<LoginPage />);
    // 登録モードへ切り替え
    fireEvent.click(screen.getByText("アカウントをお持ちでない方はこちら"));
    fireEvent.change(screen.getByPlaceholderText("メールアドレス"), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("パスワード（6文字以上）"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "登録する" }));
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/genre");
    });
  });
});
