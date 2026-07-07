"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import {
  fetchPlaces,
  fetchPlaceWithPoems,
  Place,
  PlaceWithPoems,
} from "@/lib/supabase";

export default function Home() {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selected, setSelected] = useState<PlaceWithPoems | null>(null);
  const [loading, setLoading] = useState(true);
  const [poemLoading, setPoemLoading] = useState(false);

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
    fetchPlaces()
      .then(setPlaces)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // 渲染标记
  const handleMarkerClick = useCallback(
    async (place: Place) => {
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
    },
    []
  );

  useEffect(() => {
    if (!mapRef.current || places.length === 0) return;

    const markers: maplibregl.Marker[] = [];

    places.forEach((place) => {
      const el = document.createElement("div");
      el.className = "marker";
      el.innerHTML = `${place.name}`;
      el.addEventListener("click", () => handleMarkerClick(place));

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([place.lng, place.lat])
        .addTo(mapRef.current!);
      markers.push(marker);
    });

    return () => markers.forEach((m) => m.remove());
  }, [places, handleMarkerClick]);

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
      {/* 地图区域 */}
      <div ref={containerRef} style={{ flex: 1, height: "100%" }} />

      {/* 右侧面板 */}
      <div
        className="poem-panel"
        style={{
          width: 400,
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
              <h2 style={{ fontSize: "24px", color: "#3a2f1a", fontWeight: 600 }}>
                {selected.name}
              </h2>
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
                    fontFamily: '"Noto Serif SC", "Source Han Serif SC", "SimSun", serif',
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
              点击地图上的任意标记，探索这片土地上的诗词
            </p>
            <div style={{ marginTop: "32px", fontSize: "13px", color: "#a09070" }}>
              <p>共收录 {places.length} 个城市</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
