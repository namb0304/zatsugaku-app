import { describe, expect, it } from "vitest";

import { resolveApiBase } from "@/lib/api";

describe("resolveApiBase", () => {
  it("本番で未設定なら同一オリジンを使う", () => {
    expect(resolveApiBase(undefined, "production")).toBe("");
  });

  it("ローカル開発で未設定ならFastAPIの既定URLを使う", () => {
    expect(resolveApiBase(undefined, "development")).toBe(
      "http://localhost:8000",
    );
  });

  it("明示されたURLを優先し末尾のスラッシュを除く", () => {
    expect(
      resolveApiBase("https://api.example.com/", "production"),
    ).toBe("https://api.example.com");
  });
});
