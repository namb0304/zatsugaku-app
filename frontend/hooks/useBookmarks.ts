"use client";

import { useEffect, useState } from "react";
import { bookmarkService, Bookmark } from "@/services/bookmarkService";

export const useBookmarks = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookmarks = async () => {
    try {
      setLoading(true);
      const data = await bookmarkService.getAll();
      setBookmarks(data);
    } finally {
      setLoading(false);
    }
  };

  const removeBookmark = async (trivia_id: number) => {
    await bookmarkService.delete(trivia_id);
    setBookmarks((prev) =>
      prev.filter((b) => b.trivia.id !== trivia_id)
    );
  };

  useEffect(() => {
    fetchBookmarks();
  }, []);

  return {
    bookmarks,
    loading,
    removeBookmark,
    refetch: fetchBookmarks,
  };
};