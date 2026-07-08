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

  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 1) {
      setSearchResults([]);
      setShowSearch(false);
      return;
    }
    setShowSearch(true);
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(data.results ?? []);
    } catch (err) {
      console.error(err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const debouncedSearch = useCallback(
    (q: string) => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => handleSearch(q), 300);
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

  // 加载地点列表
  useEffect(() => {
    setLoading(true);
    fetchPlaces(activeType)
      .then(setPlaces)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeType]);

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

        {/* 搜索框 */}
        <div
          style={{
            position: "absolute",
            top: 60,
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
              borderBottom: showSearch ? "1px solid #e8e0d0" : "none",
            }}>
              <span style={{ color: "#8b6914", marginRight: 8 }}>🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => debouncedSearch(e.target.value)}
                placeholder="搜索诗名、作者、名句..."
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
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(""); setSearchResults([]); setShowSearch(false); }}
                  style={{
                    border: "none", background: "transparent",
                    cursor: "pointer", color: "#a09070", fontSize: 16,
                  }}
                >✕</button>
              )}
            </div>
            {showSearch && (
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                {searchResults.length === 0 && !searchLoading ? (
                  <div style={{ padding: "16px 14px", color: "#a09070", fontSize: 13 }}>
                    未找到相关诗词
                  </div>
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
            )}
          </div>
        </div>

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
              共 {selected.poems.length} 首诗词
            </p>
            {selected.poems.map((poem, i) => (
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
