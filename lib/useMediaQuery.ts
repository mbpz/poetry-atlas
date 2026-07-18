"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener("change", notify);
      return () => mediaQuery.removeEventListener("change", notify);
    },
    [query],
  );
  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 768px)");
}

export function useTouchEvents(onSwipeUp: () => void, onSwipeDown: () => void) {
  useEffect(() => {
    let startY = 0;
    let currentY = 0;

    const handleStart = (event: TouchEvent) => {
      startY = event.touches[0].clientY;
    };

    const handleMove = (event: TouchEvent) => {
      currentY = event.touches[0].clientY;
    };

    const handleEnd = () => {
      const difference = startY - currentY;
      if (difference > 60) onSwipeUp();
      else if (difference < -60) onSwipeDown();
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
