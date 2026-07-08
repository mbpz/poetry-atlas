"use client";

import { useState, useEffect } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 768px)");
}

export function useTouchEvents(onSwipeUp: () => void, onSwipeDown: () => void) {
  useEffect(() => {
    let startY = 0;
    let currentY = 0;

    const handleStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
    };

    const handleMove = (e: TouchEvent) => {
      currentY = e.touches[0].clientY;
    };

    const handleEnd = () => {
      const diff = startY - currentY;
      if (diff > 60) onSwipeUp();
      else if (diff < -60) onSwipeDown();
    };

    document.addEventListener("touchstart", handleStart, { passive: true });
    document.addEventListener("touchmove", handleMove, { passive: true });
    document.addEventListener("touchend", handleEnd);

    return () => {
      document.removeEventListener("touchstart", handleStart);
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleEnd);
    };
  }, [onSwipeUp, onSwipeDown]);
}
