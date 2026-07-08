"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import {
  fetchPlaces,
  fetchPlaceWithPoems,
  PLACE_TYPES,
  Place,
  PlaceWithPoems,
} from "@/lib/supabase";

type SearchResult = {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  content: string;
  places: { id: string; name: string; type: string }[];
};

type Author = {
  id: string;
  name: string;
  dynasty: string;
  poem_count: number;
  place_count: number;
};

type AuthorRoute = {
  place_id: string;
  place_name: string;
  place_type: string;
  lng: number;
  lat: number;
  poem_count_at_place: number;
};

export default function Home() {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selected, setSelected] = useState<PlaceWithPoems | null>(null);
  const [loading, setLoading] = useState(true);
  const [poemLoading, setPoemLoading] = useState(false);
  const [activeType, setActiveType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const isComposingRef = useRef(false);
  const [activeDynasty, setActiveDynasty] = useState<string>("all");
  const [dynasties, setDynasties] = useState<{ id: string; name: string }[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [selectedAuthor, setSelectedAuthor] = useState<Author | null>(null);
  const [authorRoute, setAuthorRoute] = useState<AuthorRoute[]>([]);
  const [showAuthorPanel, setShowAuthorPanel] = useState(false);

  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      setShowSearch(false);
      return;
    }
    // 取消上一个未完成的请求（幂等）
    if (searchAbortRef.current) searchAbortRef.current.abort();
    const ac = new AbortController();
    searchAbortRef.current = ac;

    setShowSearch(true);
    setSearchLoading(true);
    try {
      const typeParam = activeType !== "all" ? `&type=${activeType}` : "";
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}${typeParam}`, {
        signal: ac.signal,
      });
      if (!res.ok) throw new Error("search failed");
      const data = await res.json();
      if (!ac.signal.aborted) setSearchResults(data.results ?? []);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.error(err);
        setSearchResults([]);
      }
    } finally {
      if (!ac.signal.aborted) setSearchLoading(false);
    }
  }, [activeType]);

  const debouncedSearch = useCallback(
    (q: string) => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => handleSearch(q), 400);
    },
    [handleSearch]
  );

  const handleSearchResultClick = useCallback(
    async (placeId: string) => {
      setShowSearch(false);
      setSearchQuery("");
      setSearchResults([]);
      setPoemLoading(true);
      setSelected(null);
      try {
        const data = await fetchPlaceWithPoems(placeId);
        setSelected(data);
        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [data.lng, data.lat],
            zoom: 8,
            speed: 1.2,
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setPoemLoading(false);
      }
    },
    []
  );

  // 初始化地图
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: [
              "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
              "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
              "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            attribution: "&copy; OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: [104, 35],
      zoom: 4.2,
      minZoom: 3,
      maxZoom: 10,
    });

    mapRef.current.addControl(new maplibregl.NavigationControl(), "top-right");

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // 加载朝代列表
  useEffect(() => {
    fetch("https://ivjopdktmxbvubeqqujd.supabase.co/rest/v1/dynasties?id=not.eq.contemp&select=id,name&order=sort_order", {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
    })
      .then((r) => r.json())
      .then(setDynasties)
      .catch(console.error);
  }, []);

  // 加载作者列表
  useEffect(() => {
    fetch("/api/authors?minPoems=5")
      .then((r) => r.json())
      .then((d) => setAuthors(d.authors ?? []))
      .catch(console.error);
  }, []);

  // 加载作者旅行路线
  const loadAuthorRoute = useCallback(async (authorId: string) => {
    try {
      const res = await fetch(`/api/authors/${authorId}`);
      const data = await res.json();
      setAuthorRoute(data.route ?? []);
      setSelectedAuthor(data.author);
      setShowAuthorPanel(true);
      // 飞到路线中心
      if (data.route && data.route.length > 0 && mapRef.current) {
        const avgLng = data.route.reduce((s: number, r: AuthorRoute) => s + r.lng, 0) / data.route.length;
        const avgLat = data.route.reduce((s: number, r: AuthorRoute) => s + r.lat, 0) / data.route.length;
        mapRef.current.flyTo({ center: [avgLng, avgLat], zoom: 5, speed: 1.5 });
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  // 加载地点列表
  useEffect(() => {
    setLoading(true);
    fetchPlaces(activeType)
      .then(setPlaces)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeType]);

  // 渲染作者路线标记
  useEffect(() => {
    if (!mapRef.current) return;
    // 清除旧路线
    document.querySelectorAll(".author-marker").forEach((el) => el.remove());
    document.querySelectorAll(".route-line").forEach((el) => el.remove());

    if (authorRoute.length === 0) return;

    // 添加连线（SVG 覆盖层）
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "route-line");
    svg.style.position = "absolute";
    svg.style.top = "0";
    svg.style.left = "0";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.pointerEvents = "none";
    svg.style.zIndex = "5";

    for (let i = 0; i < authorRoute.length - 1; i++) {
      const from = mapRef.current.project([authorRoute[i].lng, authorRoute[i].lat]);
      const to = mapRef.current.project([authorRoute[i + 1].lng, authorRoute[i + 1].lat]);
      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", String(from.x));
      line.setAttribute("y1", String(from.y));
      line.setAttribute("x2", String(to.x));
      line.setAttribute("y2", String(to.y));
      line.setAttribute("stroke", "#c9a961");
      line.setAttribute("stroke-width", "2");
      line.setAttribute("stroke-dasharray", "4,4");
      line.setAttribute("opacity", "0.6");
      svg.appendChild(line);
    }
    containerRef.current?.appendChild(svg);

    // 作者足迹点
    authorRoute.forEach((r, idx) => {
      const el = document.createElement("div");
      el.className = "author-marker";
      el.style.cssText = `
        background: #8b6914; color: white; border-radius: 50%;
        width: 28px; height: 28px; display: flex; align-items: center;
        justify-content: center; font-size: 12px; font-weight: bold;
        cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        border: 2px solid white;
      `;
      el.textContent = String(idx + 1);
      el.addEventListener("click", async () => {
        setPoemLoading(true);
        setSelected(null);
        try {
          const data = await fetchPlaceWithPoems(r.place_id);
          setSelected(data);
        } catch (err) {
          console.error(err);
        } finally {
          setPoemLoading(false);
        }
      });
      new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([r.lng, r.lat])
        .addTo(mapRef.current!);
    });
  }, [authorRoute, places]);

  // 渲染标记
  const handleMarkerClick = useCallback(async (place: Place) => {
    setPoemLoading(true);
    setSelected(null);
    try {
      const data = await fetchPlaceWithPoems(place.id);
      setSelected(data);
    } catch (err) {
      console.error(err);
    } finally {
      setPoemLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!mapRef.current || places.length === 0) return;

    // 清除现有标记
    document.querySelectorAll(".marker").forEach((el) => el.remove());

    places.forEach((place) => {
      const el = document.createElement("div");
      el.className = "marker";
      const icon = PLACE_TYPES[place.type]?.icon || "📍";
      el.innerHTML = `${icon}<br><b>${place.name}</b>`;
      el.addEventListener("click", () => handleMarkerClick(place));

      new maplibregl.Marker({ element: el })
        .setLngLat([place.lng, place.lat])
        .addTo(mapRef.current!);
    });
  }, [places, handleMarkerClick]);

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
      {/* 地图区域 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* 维度筛选栏 */}
        <div
          style={{
            padding: "12px 20px",
            background: "#faf8f3",
            borderBottom: "1px solid #e0d8c8",
            display: "flex",
            gap: "8px",
            alignItems: "center",
          }}
        >
          <span
            onClick={() => setShowAuthorPanel(!showAuthorPanel)}
            style={{
              cursor: "pointer",
              padding: "4px 10px",
              background: showAuthorPanel ? "#8b6914" : "transparent",
              color: showAuthorPanel ? "#fff" : "#8b6914",
              borderRadius: "4px",
              fontSize: "13px",
              border: "1px solid #8b6914",
              marginRight: "12px",
            }}
          >
            🧑‍🎤 作者
          </span>
          <span style={{ color: "#8b6914", fontSize: "14px", marginRight: "8px" }}>
            维度：
          </span>
          <button
            onClick={() => setActiveType("all")}
            style={{
              padding: "5px 14px",
              border: "1px solid #8b6914",
              borderRadius: "4px",
              background: activeType === "all" ? "#8b6914" : "transparent",
              color: activeType === "all" ? "#fff" : "#8b6914",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            全部
          </button>
          {Object.entries(PLACE_TYPES).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setActiveType(key)}
              style={{
                padding: "5px 14px",
                border: "1px solid #8b6914",
                borderRadius: "4px",
                background: activeType === key ? "#8b6914" : "transparent",
                color: activeType === key ? "#fff" : "#8b6914",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              {val.icon} {val.label}
            </button>
          ))}
          <span style={{ marginLeft: "auto", color: "#a09070", fontSize: "13px" }}>
            {places.length} 个地点
          </span>
        </div>

        {/* 朝代时间轴 */}
        <div
          style={{
            padding: "10px 20px",
            background: "#f5f0e0",
            borderBottom: "1px solid #e0d8c8",
            display: "flex",
            gap: "6px",
            alignItems: "center",
            overflowX: "auto",
          }}
        >
          <span style={{ color: "#8b6914", fontSize: "13px", marginRight: "8px", whiteSpace: "nowrap" }}>
            朝代：
          </span>
          <button
            onClick={() => setActiveDynasty("all")}
            style={{
              padding: "4px 12px",
              border: "1px solid #8b6914",
              borderRadius: "4px",
              background: activeDynasty === "all" ? "#8b6914" : "transparent",
              color: activeDynasty === "all" ? "#fff" : "#8b6914",
              cursor: "pointer",
              fontSize: "12px",
              whiteSpace: "nowrap",
            }}
          >
            全部
          </button>
          {dynasties.map((d) => (
            <button
              key={d.id}
              onClick={() => setActiveDynasty(d.id)}
              style={{
                padding: "4px 12px",
                border: "1px solid #8b6914",
                borderRadius: "4px",
                background: activeDynasty === d.id ? "#8b6914" : "transparent",
                color: activeDynasty === d.id ? "#fff" : "#8b6914",
                cursor: "pointer",
                fontSize: "12px",
                whiteSpace: "nowrap",
              }}
            >
              {d.name}
            </button>
          ))}
        </div>

        {/* 作者选择器（下拉） */}
        {showAuthorPanel && (
          <div
            style={{
              position: "absolute",
              top: 92,
              left: 20,
              zIndex: 11,
              width: 280,
              background: "rgba(255,255,255,0.97)",
              borderRadius: 8,
              boxShadow: "0 2px 16px rgba(0,0,0,0.12)",
              padding: "12px",
            }}
          >
            <div style={{ fontSize: 13, color: "#8b6914", marginBottom: 8, fontWeight: 600 }}>
              选择作者查看足迹路线
            </div>
            <div style={{ maxHeight: 250, overflowY: "auto" }}>
              {authors.slice(0, 15).map((a) => (
                <div
                  key={a.id}
                  onClick={() => loadAuthorRoute(a.id)}
                  style={{
                    padding: "6px 8px",
                    cursor: "pointer",
                    borderRadius: 4,
                    fontSize: 13,
                    color: "#3a2f1a",
                    display: "flex",
                    justifyContent: "space-between",
                    background: selectedAuthor?.id === a.id ? "#f5f0e0" : "transparent",
                  }}
                >
                  <span>{a.name} · {a.dynasty}</span>
                  <span style={{ color: "#a09070", fontSize: 11 }}>
                    {a.poem_count}首/{a.place_count}地
                  </span>
                </div>
              ))}
            </div>
            {selectedAuthor && (
              <div style={{
                marginTop: 8,
                paddingTop: 8,
                borderTop: "1px solid #e8e0d0",
                fontSize: 12,
                color: "#6a5a3a",
              }}>
                <b>{selectedAuthor.name}</b>：{authorRoute.length} 个足迹点
                <button
                  onClick={() => { setSelectedAuthor(null); setAuthorRoute([]); setShowAuthorPanel(false); }}
                  style={{
                    float: "right",
                    border: "none", background: "transparent",
                    color: "#8b6914", cursor: "pointer", fontSize: 12,
                  }}
                >清除</button>
              </div>
            )}
          </div>
        )}

        {/* 搜索按钮（折叠式，不遮挡朝代轴） */}
        <div style={{ position: "absolute", top: 92, left: 20, zIndex: 10 }}>
          <button
            onClick={() => setShowSearch(!showSearch)}
            style={{
              width: 36, height: 36, borderRadius: 8, border: "none",
              background: "rgba(255,255,255,0.95)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
              cursor: "pointer", fontSize: 18,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >🔍</button>
        </div>

        {/* 搜索面板（展开时浮层显示） */}
        {showSearch && (
          <div
            style={{
              position: "absolute",
              top: 136,
              left: 20,
              zIndex: 10,
              width: 340,
            }}
          >
            <div style={{
              background: "rgba(255,255,255,0.97)",
              borderRadius: 8,
              boxShadow: "0 2px 16px rgba(0,0,0,0.12)",
              overflow: "hidden",
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 14px",
                borderBottom: "1px solid #e8e0d0",
              }}>
                <span style={{ color: "#8b6914", marginRight: 8 }}>🔍</span>
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onCompositionStart={() => { isComposingRef.current = true; }}
                  onCompositionEnd={(e) => {
                    isComposingRef.current = false;
                    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                    handleSearch((e.target as HTMLInputElement).value);
                  }}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    // 仅英文/数字模式下自动搜索（跳过中文拼音组合阶段）
                    if (!isComposingRef.current && e.target.value.trim().length >= 2) {
                      debouncedSearch(e.target.value);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && searchQuery.trim().length >= 2) {
                      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                      handleSearch(searchQuery);
                    }
                  }}
                  placeholder="搜索诗名/作者/名句..."
                  style={{
                    border: "none",
                    outline: "none",
                    flex: 1,
                    fontSize: 14,
                    color: "#3a2f1a",
                    background: "transparent",
                  }}
                />
                {searchLoading && (
                  <span style={{ fontSize: 12, color: "#a09070" }}>...</span>
                )}
                <button
                  onClick={() => { setSearchQuery(""); setSearchResults([]); setShowSearch(false); }}
                  style={{
                    border: "none", background: "transparent",
                    cursor: "pointer", color: "#a09070", fontSize: 16,
                  }}
                >✕</button>
              </div>
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                {searchResults.length === 0 && !searchLoading ? (
                  searchQuery.length < 2 ? (
                    <div style={{ padding: "16px 14px", color: "#a09070", fontSize: 13 }}>
                      请输入至少 2 个字符
                    </div>
                  ) : (
                    <div style={{ padding: "16px 14px", color: "#a09070", fontSize: 13 }}>
                      未找到相关诗词
                    </div>
                  )
                ) : (
                  searchResults.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        padding: "12px 14px",
                        borderBottom: "1px solid #f0ebe0",
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        if (r.places.length > 0) handleSearchResultClick(r.places[0].id);
                        setShowSearch(false);
                      }}
                    >
                      <div style={{ fontSize: 14, color: "#3a2f1a", fontWeight: 500 }}>
                        {r.title}
                        <span style={{ color: "#8b6914", fontSize: 12, marginLeft: 8 }}>
                          {r.author} · {r.dynasty}
                        </span>
                      </div>
                      <div style={{
                        fontSize: 12, color: "#6a5a3a", marginTop: 4,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {r.content.replace(/\n/g, " ")}
                      </div>
                      {r.places.length > 0 && (
                        <div style={{ marginTop: 4 }}>
                          {r.places.slice(0, 3).map((pl) => (
                            <span key={pl.id} style={{
                              fontSize: 11, color: "#8b6914",
                              background: "#f5f0e0", padding: "2px 6px",
                              borderRadius: 4, marginRight: 4,
                            }}>
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

        {/* 地图 */}
        <div ref={containerRef} style={{ flex: 1 }} />
      </div>

      {/* 右侧诗词面板 */}
      <div
        className="poem-panel"
        style={{
          width: 420,
          height: "100%",
          background: "#faf8f3",
          borderLeft: "1px solid #e0d8c8",
          overflowY: "auto",
        }}
      >
        {loading ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "#8b6914" }}>
            加载中…
          </div>
        ) : selected ? (
          <div style={{ padding: "24px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "22px" }}>
                  {PLACE_TYPES[selected.type]?.icon || "📍"}
                </span>
                <h2 style={{ fontSize: "24px", color: "#3a2f1a", fontWeight: 600 }}>
                  {selected.name}
                </h2>
                {selected.ancient_names && selected.ancient_names.length > 0 && (
                  <span style={{ fontSize: "12px", color: "#b8860b", marginLeft: "4px" }}>
                    ({selected.ancient_names.join(" · ")})
                  </span>
                )}
                <span
                  style={{
                    fontSize: "12px",
                    color: "#8b6914",
                    background: "#f5f0e0",
                    padding: "2px 8px",
                    borderRadius: "10px",
                  }}
                >
                  {PLACE_TYPES[selected.type]?.label}
                </span>
                {activeType !== "all" && activeType !== selected.type && (
                  <span style={{ fontSize: 11, color: "#c9a961", marginLeft: 8 }}>
                    （当前筛选：{PLACE_TYPES[activeType]?.label}）
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#8b6914",
                  padding: "4px 8px",
                }}
              >
                ✕
              </button>
            </div>
            <p style={{ color: "#8b6914", fontSize: "14px", marginBottom: "24px" }}>
              {activeDynasty === "all"
                ? `共 ${selected.poems.length} 首诗词`
                : `${dynasties.find((d) => d.id === activeDynasty)?.name || ""}筛选 · ${
                    selected.poems.filter((po) => po.dynasty_id === activeDynasty).length
                  } / ${selected.poems.length} 首`}
            </p>
            {selected.poems
              .filter((po) => activeDynasty === "all" || po.dynasty_id === activeDynasty)
              .map((poem, i) => (
              <div
                key={poem.id || i}
                style={{
                  marginBottom: "28px",
                  paddingBottom: "20px",
                  borderBottom: "1px solid #e8e0d0",
                }}
              >
                <h3 style={{ fontSize: "17px", color: "#3a2f1a", marginBottom: "6px" }}>
                  {poem.title}
                </h3>
                <p style={{ color: "#8b6914", fontSize: "13px", marginBottom: "12px" }}>
                  {poem.author} · {poem.dynasty}
                </p>
                <p
                  style={{
                    fontSize: "15px",
                    lineHeight: 1.9,
                    color: "#4a3f2a",
                    whiteSpace: "pre-line",
                    fontFamily:
                      '"Noto Serif SC", "Source Han Serif SC", "SimSun", serif',
                  }}
                >
                  {poem.content}
                </p>
              </div>
            ))}
          </div>
        ) : poemLoading ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "#8b6914" }}>
            加载中…
          </div>
        ) : (
          <div
            style={{
              padding: "40px 24px",
              color: "#8b6914",
              textAlign: "center",
            }}
          >
            <h2 style={{ fontSize: "22px", color: "#3a2f1a", marginBottom: "16px" }}>
              🗺️ 中国古诗词地图
            </h2>
            <p style={{ fontSize: "15px", lineHeight: 1.8, color: "#6a5a3a" }}>
              点击地图上的任意标记
              <br />
              {activeType === "all"
                ? "探索各地诗词文化"
                : `浏览${PLACE_TYPES[activeType]?.label || ""}诗词`}
            </p>
            <div
              style={{ marginTop: "32px", fontSize: "13px", color: "#a09070" }}
            >
              <p>共收录 {places.length} 个地点</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
