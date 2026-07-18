"use client";

import { useState, useEffect, useCallback } from "react";

export type FavoritePoem = {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  content: string;
  created_at?: string;
};

const STORAGE_KEY = "poetry-atlas-favorites";

function loadFavorites(): FavoritePoem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveFavorites(favs: FavoritePoem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoritePoem[]>([]);

  // 初始化加载
  useEffect(() => {
    const timeout = window.setTimeout(() => setFavorites(loadFavorites()), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  // 检查是否已收藏
  const isFavorite = useCallback(
    (poemId: string) => favorites.some((f) => f.id === poemId),
    [favorites]
  );

  // 添加/取消收藏
  const toggleFavorite = useCallback((poem: FavoritePoem) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.id === poem.id);
      const next = exists
        ? prev.filter((f) => f.id !== poem.id)
        : [...prev, { ...poem, created_at: new Date().toISOString() }];
      saveFavorites(next);
      return next;
    });
  }, []);

  // 清空收藏
  const clearFavorites = useCallback(() => {
    setFavorites([]);
    saveFavorites([]);
  }, []);

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    clearFavorites,
    count: favorites.length,
  };
}
