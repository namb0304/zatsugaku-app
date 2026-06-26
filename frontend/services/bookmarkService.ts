export type Bookmark = {
  id: number;
  trivia: {
    id: number;
    title: string;
    summary: string;
    genre: string;
    source_title: string;
    source_url: string;
  };
  created_at: string;
};

export const bookmarkService = {
  getAll: async (): Promise<Bookmark[]> => {
    const res = await fetch("/bookmarks");
    if (!res.ok) throw new Error("failed to fetch bookmarks");
    return res.json();
  },

  delete: async (trivia_id: number) => {
    const res = await fetch(`/bookmarks/${trivia_id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("failed to delete bookmark");
  },
};