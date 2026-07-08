"use client";

import { useState, useRef, useCallback } from "react";

export function BottomDrawer({
  children,
  isOpen,
  onClose,
  title,
}: {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}) {
  const [startY, setStartY] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
    setDragging(true);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!dragging) return;
      const diff = e.touches[0].clientY - startY;
      if (diff > 0) setOffsetY(diff);
    },
    [dragging, startY]
  );

  const handleTouchEnd = useCallback(() => {
    setDragging(false);
    if (offsetY > 80) {
      onClose();
    }
    setOffsetY(0);
  }, [offsetY, onClose]);

  return (
    <div
      className={`poem-panel ${isOpen ? "open" : ""}`}
      style={dragging ? { transform: `translateY(${offsetY}px)`, transition: "none" } : {}}
    >
      {/* 拖拽指示器 */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ padding: "8px 0", cursor: "grab", touchAction: "none" }}
      >
        <div className="drawer-handle" />
        {title && (
          <div
            style={{
              textAlign: "center",
              fontSize: 14,
              color: "#8b6914",
              fontWeight: 600,
              marginTop: 4,
            }}
          >
            {title}
          </div>
        )}
      </div>

      {/* 内容 */}
      <div
        ref={contentRef}
        style={{
          height: "calc(100% - 50px)",
          overflowY: "auto",
          paddingBottom: "env(safe-area-inset-bottom, 16px)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
