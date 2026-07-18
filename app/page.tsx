"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { PLACE_TYPES, type Place, type Poem } from "@/lib/supabase";
import { MapSkeleton, PoemCardSkeleton, AuthorPanelSkeleton } from "@/components/Skeleton";
import { BottomDrawer } from "@/components/BottomDrawer";
import { PoemCard } from "@/components/PoemCard";
import { useIsMobile } from "@/lib/useMediaQuery";
import { useFavorites } from "@/lib/useFavorites";
import dynamic from "next/dynamic";

// 懒加载地图组件，避免阻塞首屏
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

type SearchResult = {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  content: string;
  places: { id: string; name: string; type: string }[];
};

type SelectedPlace = {
  place: Place;
  poems: Poem[];
};

type AuthorSummary = {
  id: string;
  name: string;
  dynasty: string;
  poem_count: number;
  place_count: number;
};

type AuthorRoutePoint = {
  lng: number;
  lat: number;
};

export default function Home() {
  const isMobile = useIsMobile();
  const { count: favCount } = useFavorites();
  const [places, setPlaces] = useState<Place[]>([]);
  const [selected, setSelected] = useState<SelectedPlace | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState("all");
  const [activeDynasty, setActiveDynasty] = useState("all");
  const [dynasties, setDynasties] = useState<{ id: string; name: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [showAuthorPanel, setShowAuthorPanel] = useState(false);

  // 作者数据
  const [authors, setAuthors] = useState<AuthorSummary[]>([]);
  const [authorsLoading, setAuthorsLoading] = useState(true);
  const [authorRouteLoading, setAuthorRouteLoading] = useState(false);

  useEffect(() => {
    fetch("/api/authors?minPoems=5")
      .then((r) => r.json())
      .then((d) => setAuthors(d.authors ?? []))
      .catch(() => setAuthors([]))
      .finally(() => setAuthorsLoading(false));
  }, []);

  // 加载朝代
  useEffect(() => {
    fetch("/api/dynasties")
      .then((r) => r.json())
      .then((d) => setDynasties(d.dynasties ?? []))
      .catch(console.error);
  }, []);

  // 加载地点列表
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeType !== "all") params.set("type", activeType);
    if (activeDynasty !== "all") params.set("dynasty", activeDynasty);
    fetch(`/api/places?${params}`)
      .then((r) => r.json())
      .then((d) => setPlaces(d.places ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeType, activeDynasty]);

  // 搜索
  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      setShowSearch(false);
      return;
    }
    setShowSearch(true);
    setSearchLoading(true);
    try {
      const params = new URLSearchParams({ q });
      if (activeType !== "all") params.set("type", activeType);
      if (activeDynasty !== "all") params.set("dynasty", activeDynasty);
      const res = await fetch(`/api/search?${params}`);
      const data = await res.json();
      setSearchResults(data.results ?? []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [activeType, activeDynasty]);

  // 防抖
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedSearch = useCallback(
    (q: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => handleSearch(q), 400);
    },
    [handleSearch]
  );

  // 点击地点
  const handlePlaceClick = useCallback(async (placeId: string) => {
    const res = await fetch(`/api/places/${placeId}/poems`);
    const data = await res.json();
    setSelected(data);
  }, []);

  // 点击搜索结果
  const handleSearchResultClick = useCallback((placeId: string) => {
    setShowSearch(false);
    setSearchQuery("");
    handlePlaceClick(placeId);
  }, [handlePlaceClick]);

  // 加载作者旅行路线
  const loadAuthorRoute = useCallback(async (authorId: string) => {
    setAuthorRouteLoading(true);
    setShowAuthorPanel(false);
    try {
      const res = await fetch(`/api/authors/${authorId}`);
      const data = (await res.json()) as { route?: AuthorRoutePoint[] };
      if (data.route && data.route.length > 0) {
        const avgLng =
          data.route.reduce((sum, point) => sum + point.lng, 0) / data.route.length;
        const avgLat =
          data.route.reduce((sum, point) => sum + point.lat, 0) / data.route.length;
        // TODO: 显示路线
        console.log("Route center:", avgLng, avgLat);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setAuthorRouteLoading(false);
    }
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
      {/* 左侧地图区域 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* 维度筛选栏 */}
        <div style={styles.filterBar}>
          <span
            onClick={() => setShowAuthorPanel(!showAuthorPanel)}
            style={{ ...styles.authorBtn, background: showAuthorPanel ? "#8b6914" : "transparent", color: showAuthorPanel ? "#fff" : "#8b6914" }}
          >
            🧑‍🎤 作者
          </span>
          <span style={{ color: "#8b6914", fontSize: "14px", marginRight: "8px" }}>维度：</span>
          <button
            onClick={() => {
              setLoading(true);
              setActiveType("all");
            }}
            style={{ ...styles.filterBtn, background: activeType === "all" ? "#8b6914" : "transparent", color: activeType === "all" ? "#fff" : "#8b6914" }}
          >
            全部
          </button>
          {Object.entries(PLACE_TYPES).map(([key, val]) => (
            <button
              key={key}
              onClick={() => {
                setLoading(true);
                setActiveType(key);
              }}
              style={{ ...styles.filterBtn, background: activeType === key ? "#8b6914" : "transparent", color: activeType === key ? "#fff" : "#8b6914" }}
            >
              {val.icon} {val.label}
            </button>
          ))}
          <span style={{ marginLeft: "auto", color: "#a09070", fontSize: "13px" }}>
            {loading ? "加载中..." : `${places.length} 个地点`}
          </span>
        </div>

        {/* 朝代时间轴 */}
        <div style={styles.dynastyBar}>
          <span style={{ color: "#8b6914", fontSize: "13px", marginRight: "8px", whiteSpace: "nowrap" }}>朝代：</span>
          <button
            onClick={() => {
              setLoading(true);
              setActiveDynasty("all");
            }}
            style={{ ...styles.dynastyBtn, background: activeDynasty === "all" ? "#8b6914" : "transparent", color: activeDynasty === "all" ? "#fff" : "#8b6914" }}
          >
            全部
          </button>
          {dynasties.map((d) => (
            <button
              key={d.id}
              onClick={() => {
                setLoading(true);
                setActiveDynasty(d.id);
              }}
              style={{ ...styles.dynastyBtn, background: activeDynasty === d.id ? "#8b6914" : "transparent", color: activeDynasty === d.id ? "#fff" : "#8b6914" }}
            >
              {d.name}
            </button>
          ))}
        </div>

        {/* 搜索 + 收藏按钮 */}
        <div style={{ position: "absolute", top: 92, left: 20, zIndex: 10, display: "flex", gap: 8 }}>
          <button onClick={() => setShowSearch(!showSearch)} style={styles.searchBtn}>🔍</button>
          <Link href="/favorites" style={{ textDecoration: "none" }}>
            <button style={{ ...styles.searchBtn, background: favCount > 0 ? "#fff0f0" : "rgba(255,255,255,0.95)", position: "relative" }}>
              ❤️
              {favCount > 0 && (
                <span style={{
                  position: "absolute", top: -4, right: -4,
                  background: "#e8a0a0", color: "#fff",
                  fontSize: 10, width: 16, height: 16,
                  borderRadius: "50%", display: "flex",
                  alignItems: "center", justifyContent: "center",
                }}>
                  {favCount > 9 ? "9+" : favCount}
                </span>
              )}
            </button>
          </Link>
        </div>

        {showSearch && (
          <div style={{ position: "absolute", top: 136, left: 20, zIndex: 10, width: 340 }}>
            <div style={styles.searchPanel}>
              <div style={{ display: "flex", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid #e8e0d0" }}>
                <span style={{ color: "#8b6914", marginRight: 8 }}>🔍</span>
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={(e) => {
                    setIsComposing(false);
                    handleSearch((e.target as HTMLInputElement).value);
                  }}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (!isComposing && e.target.value.trim().length >= 2) debouncedSearch(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && searchQuery.trim().length >= 2) handleSearch(searchQuery);
                  }}
                  placeholder="搜索诗名/作者/名句..."
                  style={styles.searchInput}
                />
                {searchLoading && <span style={{ fontSize: 12, color: "#a09070" }}>...</span>}
                <button onClick={() => { setSearchQuery(""); setSearchResults([]); setShowSearch(false); }} style={styles.clearBtn}>✕</button>
              </div>
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                {searchLoading ? (
                  <div style={{ padding: 16 }}><PoemCardSkeleton /></div>
                ) : searchResults.length === 0 ? (
                  <div style={{ padding: "16px 14px", color: "#a09070", fontSize: 13 }}>
                    {searchQuery.length < 2 ? "请输入至少 2 个字符" : "未找到相关诗词"}
                  </div>
                ) : (
                  searchResults.map((r) => (
                    <div key={r.id} style={styles.searchResultItem} onClick={() => {
                      if (r.places.length > 0) handleSearchResultClick(r.places[0].id);
                      setShowSearch(false);
                    }}>
                      <div style={{ fontSize: 14, color: "#3a2f1a", fontWeight: 500 }}>
                        {r.title}
                        <span style={{ color: "#8b6914", fontSize: 12, marginLeft: 8 }}>{r.author} · {r.dynasty}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#6a5a3a", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.content.replace(/\n/g, " ")}
                      </div>
                      {r.places.length > 0 && (
                        <div style={{ marginTop: 4 }}>
                          {r.places.slice(0, 3).map((pl) => (
                            <span key={pl.id} style={styles.placeTag}>
                              {PLACE_TYPES[pl.type]?.icon || "📍"} {pl.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* 作者面板 */}
        {showAuthorPanel && (
          <div style={styles.authorPanel}>
            <div style={{ fontSize: 13, color: "#8b6914", marginBottom: 8, fontWeight: 600 }}>
              选择作者查看足迹路线
            </div>
            <div style={{ maxHeight: 250, overflowY: "auto" }}>
              {authorsLoading ? (
                <AuthorPanelSkeleton />
              ) : (
                authors.slice(0, 15).map((a) => (
                  <div
                    key={a.id}
                    style={authorRouteLoading ? styles.authorItemLoading : styles.authorItem}
                    onClick={() => !authorRouteLoading && loadAuthorRoute(a.id)}
                  >
                    {authorRouteLoading ? (
                      <>
                        <span style={{
                          width: 14,
                          height: 14,
                          border: "2px solid #e8e0d0",
                          borderTopColor: "#8b6914",
                          borderRadius: "50%",
                          animation: "spin 0.6s linear infinite",
                          display: "inline-block",
                        }} />
                        <span>加载{a.name}的路线...</span>
                      </>
                    ) : (
                      <>
                        <span>{a.name} · {a.dynasty}</span>
                        <span style={{ color: "#a09070", fontSize: 11 }}>{a.poem_count}首/{a.place_count}地</span>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 地图 */}
        <div style={{ flex: 1, position: "relative" }}>
          {loading && <MapSkeleton />}
          <MapView places={places} onMarkerClick={handlePlaceClick} />
        </div>
      </div>

      {/* 右侧诗词面板 - 桌面端 */}
      {!isMobile && (
        <div style={styles.poemPanel}>
          <div style={{ padding: "24px" }}>
            {selected ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 22 }}>{PLACE_TYPES[selected.place?.type]?.icon || "📍"}</span>
                    <h2 style={{ fontSize: 24, color: "#3a2f1a", fontWeight: 600 }}>{selected.place?.name}</h2>
                    {selected.place?.ancient_names && selected.place.ancient_names.length > 0 && (
                      <span style={{ fontSize: 12, color: "#b8860b" }}>({selected.place.ancient_names.join(" · ")})</span>
                    )}
                  </div>
                  <button onClick={() => setSelected(null)} style={styles.clearBtn}>✕</button>
                </div>
                <p style={{ color: "#8b6914", fontSize: "14px", marginBottom: "24px" }}>
                  共 {selected.poems?.length || 0} 首诗词
                </p>
                {selected.poems?.map((poem, i) => (
                  <PoemCard key={poem.id || i} poem={poem} />
                ))}
              </>
            ) : (
              <div style={{ padding: "40px 0", textAlign: "center", color: "#8b6914" }}>
                <h2 style={{ fontSize: 22, marginBottom: 16 }}>🗺️ 中国古诗词地图</h2>
                <p style={{ fontSize: 15, lineHeight: 1.8, color: "#6a5a3a" }}>
                  点击地图上的任意标记，探索各地诗词文化
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 移动端底部抽屉 */}
      {isMobile && (
        <BottomDrawer
          isOpen={!!selected}
          onClose={() => setSelected(null)}
          title={selected?.place?.name}
        >
          <div style={{ padding: "0 24px 24px" }}>
            {selected ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 22 }}>{PLACE_TYPES[selected.place?.type]?.icon || "📍"}</span>
                    <h2 style={{ fontSize: 24, color: "#3a2f1a", fontWeight: 600 }}>{selected.place?.name}</h2>
                    {selected.place?.ancient_names && selected.place.ancient_names.length > 0 && (
                      <span style={{ fontSize: 12, color: "#b8860b" }}>({selected.place.ancient_names.join(" · ")})</span>
                    )}
                  </div>
                  <button onClick={() => setSelected(null)} style={styles.clearBtn}>✕</button>
                </div>
                <p style={{ color: "#8b6914", fontSize: "14px", marginBottom: "24px" }}>
                  共 {selected.poems?.length || 0} 首诗词
                </p>
                {selected.poems?.map((poem, i) => (
                  <PoemCard key={poem.id || i} poem={poem} />
                ))}
              </>
            ) : (
              <div style={{ padding: "40px 0", textAlign: "center", color: "#8b6914" }}>
                <h2 style={{ fontSize: 22, marginBottom: 16 }}>🗺️ 中国古诗词地图</h2>
                <p style={{ fontSize: 15, lineHeight: 1.8, color: "#6a5a3a" }}>
                  点击地图上的任意标记，探索各地诗词文化
                </p>
              </div>
            )}
          </div>
        </BottomDrawer>
      )}
    </div>
  );

}

const styles: Record<string, React.CSSProperties> = {
  filterBar: {
    padding: "12px 20px",
    background: "#faf8f3",
    borderBottom: "1px solid #e0d8c8",
    display: "flex",
    gap: "8px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  dynastyBar: {
    padding: "10px 20px",
    background: "#f5f0e0",
    borderBottom: "1px solid #e0d8c8",
    display: "flex",
    gap: "6px",
    alignItems: "center",
    overflowX: "auto",
  },
  filterBtn: {
    padding: "5px 14px",
    border: "1px solid #8b6914",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "13px",
    background: "transparent",
  },
  dynastyBtn: {
    padding: "4px 12px",
    border: "1px solid #8b6914",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
    whiteSpace: "nowrap",
    background: "transparent",
  },
  authorBtn: {
    cursor: "pointer",
    padding: "4px 10px",
    borderRadius: "4px",
    fontSize: "13px",
    border: "1px solid #8b6914",
    marginRight: "12px",
  },
  searchBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    border: "none",
    background: "rgba(255,255,255,0.95)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
    cursor: "pointer",
    fontSize: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  searchPanel: {
    background: "rgba(255,255,255,0.97)",
    borderRadius: 8,
    boxShadow: "0 2px 16px rgba(0,0,0,0.12)",
    overflow: "hidden",
  },
  searchInput: {
    border: "none",
    outline: "none",
    flex: 1,
    fontSize: 14,
    color: "#3a2f1a",
    background: "transparent",
  },
  clearBtn: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: "#a09070",
    fontSize: 16,
  },
  searchResultItem: {
    padding: "12px 14px",
    borderBottom: "1px solid #f0ebe0",
    cursor: "pointer",
  },
  placeTag: {
    fontSize: 11,
    color: "#8b6914",
    background: "#f5f0e0",
    padding: "2px 6px",
    borderRadius: 4,
    marginRight: 4,
  },
  authorPanel: {
    position: "absolute",
    top: 92,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 11,
    width: 320,
    background: "rgba(255,255,255,0.97)",
    borderRadius: 8,
    boxShadow: "0 2px 16px rgba(0,0,0,0.12)",
    padding: 12,
  },
  authorItem: {
    padding: "10px 8px",
    cursor: "pointer",
    borderRadius: 4,
    fontSize: 13,
    color: "#3a2f1a",
    display: "flex",
    justifyContent: "space-between",
    transition: "background 0.15s",
  },
  authorItemLoading: {
    padding: "10px 8px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "#8b6914",
    fontSize: 13,
  },
  poemPanel: {
    width: 420,
    height: "100%",
    background: "#faf8f3",
    borderLeft: "1px solid #e0d8c8",
    overflowY: "auto",
  },
};
