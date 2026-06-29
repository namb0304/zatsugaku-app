import {
  addBookmark as apiAddBookmark,
  fetchBookmarks,
  removeBookmark as apiRemoveBookmark,
  type BookmarkItem,
} from "@/lib/api";
import { authService } from "@/services/authService";

export type { BookmarkItem };

async function getToken(): Promise<string> {
  const token = await authService.getAccessToken();
  if (!token) throw new Error("unauthenticated");
  return token;
}

export const bookmarkService = {
  getAll: async (): Promise<BookmarkItem[]> => {
    const token = await getToken();
    return fetchBookmarks(token);
  },

  add: async (triviaId: string): Promise<void> => {
    const token = await getToken();
    return apiAddBookmark(triviaId, token);
  },

  delete: async (triviaId: string): Promise<void> => {
    const token = await getToken();
    return apiRemoveBookmark(triviaId, token);
  },
};
