const STORAGE_KEY = "trivia_viewed_ids";
const MAX_IDS = 200;

function readIds(): string[] {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "[]",
    );
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((id): id is string => typeof id === "string")
      .slice(-MAX_IDS);
  } catch {
    return [];
  }
}

export function markViewed(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const ids = readIds();
    if (ids.includes(id)) return;
    ids.push(id);
    if (ids.length > MAX_IDS) ids.splice(0, ids.length - MAX_IDS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // localStorage unavailable (private browsing etc.)
  }
}

export function getViewedIds(): string[] {
  if (typeof window === "undefined") return [];
  return readIds();
}

export function prioritizeUnviewed<T extends { id: string }>(
  items: readonly T[],
  viewedIds: readonly string[],
): T[] {
  const viewed = new Set(viewedIds);
  return [
    ...items.filter((item) => !viewed.has(item.id)),
    ...items.filter((item) => viewed.has(item.id)),
  ];
}
