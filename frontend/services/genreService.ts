export const genreService = {
  getLocal: (): string[] => {
    if (typeof window === "undefined") return [];
    try {
      const value: unknown = JSON.parse(
        localStorage.getItem("selectedGenres") || "[]",
      );
      return Array.isArray(value) &&
        value.every((genre) => typeof genre === "string")
        ? value
        : [];
    } catch {
      return [];
    }
  },

  saveLocal: (genres: string[]) => {
    if (typeof window === "undefined") return;
    localStorage.setItem("selectedGenres", JSON.stringify(genres));
  },

  getRemote: async (accessToken: string): Promise<string[]> => {
    const { fetchPreferences } = await import("@/lib/api");
    return fetchPreferences(accessToken);
  },

  saveRemote: async (genres: string[], accessToken: string): Promise<void> => {
    const { savePreferences } = await import("@/lib/api");
    return savePreferences(genres, accessToken);
  },
};
