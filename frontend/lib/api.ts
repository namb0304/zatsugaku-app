import type { TriviaItem } from "@/types/trivia";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");
const REQUEST_TIMEOUT_MS = 10_000;

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isTriviaItem(value: unknown): value is TriviaItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.summary === "string" &&
    typeof item.genre === "string" &&
    Array.isArray(item.tags) &&
    item.tags.every((tag) => typeof tag === "string") &&
    typeof item.source_title === "string" &&
    isHttpUrl(item.source_url)
  );
}

export async function fetchTriviaFeed(): Promise<TriviaItem[]> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );

  try {
    const res = await fetch(`${API_BASE}/trivia/feed`, {
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`feed fetch failed: ${res.status}`);

    const data: unknown = await res.json();
    if (
      typeof data !== "object" ||
      data === null ||
      !("items" in data) ||
      !Array.isArray(data.items) ||
      !data.items.every(isTriviaItem)
    ) {
      throw new Error("feed response has an invalid format");
    }
    if (new Set(data.items.map((item) => item.id)).size !== data.items.length) {
      throw new Error("feed response contains duplicate IDs");
    }
    return data.items;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
