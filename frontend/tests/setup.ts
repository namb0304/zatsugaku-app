import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import React from "react";

// next/link を素の <a> で代替（JSX 不使用で .ts のまま維持）
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => React.createElement("a", { href, className }, children),
}));
