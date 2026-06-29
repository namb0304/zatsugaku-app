import type { TriviaItem } from "@/types/trivia";

export type BookmarkTrivia = {
  id: string;
  title: string;
  summary: string;
  genre: string;
  source_title: string;
  source_url: string;
};

export type BookmarkItem = {
  id: string;
  trivia: BookmarkTrivia;
  created_at: string;
};

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");
const REQUEST_TIMEOUT_MS = 10_000;

async function apiFetch(
  path: string,
  init: RequestInit = {},
  accessToken?: string | null,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string>),
    };
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }
    return await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

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

export async function fetchBookmarks(accessToken: string): Promise<BookmarkItem[]> {
  const res = await apiFetch("/bookmarks", {}, accessToken);
  if (!res.ok) throw new Error(`fetch bookmarks failed: ${res.status}`);
  const data: unknown = await res.json();
  if (
    typeof data !== "object" ||
    data === null ||
    !("items" in data) ||
    !Array.isArray((data as { items: unknown }).items)
  ) {
    throw new Error("bookmarks response has an invalid format");
  }
  return (data as { items: BookmarkItem[] }).items;
}

export async function addBookmark(
  triviaId: string,
  accessToken: string,
): Promise<void> {
  const res = await apiFetch(
    "/bookmarks",
    { method: "POST", body: JSON.stringify({ trivia_id: triviaId }) },
    accessToken,
  );
  if (!res.ok) throw new Error(`add bookmark failed: ${res.status}`);
}

export async function removeBookmark(
  triviaId: string,
  accessToken: string,
): Promise<void> {
  const res = await apiFetch(
    `/bookmarks/${triviaId}`,
    { method: "DELETE" },
    accessToken,
  );
  if (!res.ok) throw new Error(`remove bookmark failed: ${res.status}`);
}

export async function fetchPreferences(accessToken: string): Promise<string[]> {
  const res = await apiFetch("/me/preferences", {}, accessToken);
  if (!res.ok) throw new Error(`fetch preferences failed: ${res.status}`);
  const data: unknown = await res.json();
  if (typeof data !== "object" || data === null || !("genres" in data)) {
    throw new Error("preferences response has an invalid format");
  }
  const genres = (data as { genres: unknown }).genres;
  if (!Array.isArray(genres) || !genres.every((genre) => typeof genre === "string")) {
    throw new Error("preferences response has an invalid format");
  }
  return genres;
}

export async function savePreferences(
  genres: string[],
  accessToken: string,
): Promise<void> {
  const res = await apiFetch(
    "/me/preferences",
    { method: "PUT", body: JSON.stringify({ genres }) },
    accessToken,
  );
  if (!res.ok) throw new Error(`save preferences failed: ${res.status}`);
}

export async function postViewHistory(
  triviaId: string,
  accessToken: string,
): Promise<void> {
  const res = await apiFetch(
    "/me/view-history",
    { method: "POST", body: JSON.stringify({ trivia_id: triviaId }) },
    accessToken,
  );
  if (!res.ok) throw new Error(`save view history failed: ${res.status}`);
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
