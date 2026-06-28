export const genreService = {
  getLocal: (): string[] => {
    if (typeof window === "undefined") return [];
    return JSON.parse(localStorage.getItem("selectedGenres") || "[]");
  },

  saveLocal: (genres: string[]) => {
    if (typeof window === "undefined") return;
    localStorage.setItem("selectedGenres", JSON.stringify(genres));
  },

  getRemote: async (): Promise<string[]> => {
    const res = await fetch("/me/preferences");
    if (!res.ok) return [];
    return res.json();
  },

  saveRemote: async (genres: string[]) => {
    const res = await fetch("/me/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ genres }),
    });

    if (!res.ok) throw new Error("failed to save genres");
  },
};