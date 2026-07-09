"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useFavorites, FavoritePoem } from "@/lib/useFavorites";
import { PoemCard } from "@/components/PoemCard";

export default function FavoritesPage() {
  const { favorites, clearFavorites, count } = useFavorites();
  const [search, setSearch] = useState("");

  // 搜索过滤
  const filtered = useMemo(() => {
    if (!search.trim()) return favorites;
    const q = search.toLowerCase();
    return favorites.filter(
      (f) =>
        f.title.toLowerCase().includes(q) ||
        f.author.toLowerCase().includes(q) ||
        f.content.toLowerCase().includes(q)
    );
  }, [favorites, search]);

  return (
    <div style={{ minHeight: "100vh", background: "#faf8f3" }}>
      {/* 顶部栏 */}
      <div
        style={{
          padding: "16px 20px",
          background: "#fff",
          borderBottom: "1px solid #e8dcc8",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Link
          href="/"
          style={{ color: "#8b6914", textDecoration: "none", fontSize: 20 }}
        >
          ←
        </Link>
        <h1 style={{ margin: 0, fontSize: 20, color: "#3a2f1a", flex: 1 }}>
          我的诗单
        </h1>
        {count > 0 && (
          <button
            onClick={() => {
              if (confirm("确定清空所有收藏？")) clearFavorites();
            }}
            style={{
              border: "1px solid #e8dcc8",
              background: "transparent",
              color: "#a08050",
              padding: "6px 12px",
              borderRadius: 6,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            清空
          </button>
        )}
      </div>

      {/* 搜索栏 */}
      <div style={{ padding: "12px 20px" }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索收藏的诗..."
          style={{
            width: "100%",
            padding: "10px 16px",
            border: "1px solid #e8dcc8",
            borderRadius: 8,
            background: "#fff",
            fontSize: 14,
            outline: "none",
            color: "#3a2f1a",
          }}
        />
      </div>

      {/* 列表 */}
      <div style={{ padding: "0 20px 20px" }}>
        {filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "#a08050",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>
              {count === 0 ? "📚" : "🔍"}
            </div>
            <p>
              {count === 0
                ? "还没有收藏的诗，快去地图上探索吧"
                : "没有匹配的收藏"}
            </p>
            {count === 0 && (
              <Link
                href="/"
                style={{
                  display: "inline-block",
                  marginTop: 16,
                  padding: "10px 24px",
                  background: "#8b6914",
                  color: "#fff",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontSize: 14,
                }}
              >
                去探索
              </Link>
            )}
          </div>
        ) : (
          filtered.map((poem) => (
            <PoemCard key={poem.id} poem={poem} />
          ))
        )}
      </div>

      {/* 计数 */}
      {count > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(139, 105, 20, 0.9)",
            color: "#fff",
            padding: "8px 20px",
            borderRadius: 20,
            fontSize: 13,
          }}
        >
          共收藏 {filtered.length !== count ? `${filtered.length}/${count}` : count} 首
        </div>
      )}
    </div>
  );
}
