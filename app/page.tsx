"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";

import placesData from "@/public/data/places.json";

type Poem = {
  title: string;
  author: string;
  dynasty: string;
  content: string;
};

type Place = {
  id: string;
  name: string;
  lng: number;
  lat: number;
  poems: Poem[];
};

const places = placesData as Place[];

export default function Home() {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Place | null>(null);

  const handleMarkerClick = useCallback((place: Place) => {
    setSelected(place);
  }, []);

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
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
          },
        ],
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

  useEffect(() => {
    if (!mapRef.current) return;

    const markers: maplibregl.Marker[] = [];

    places.forEach((place) => {
      const el = document.createElement("div");
      el.className = "marker";
      el.innerHTML = `${place.name}<br><b>${place.poems.length}首</b>`;
      el.addEventListener("click", () => handleMarkerClick(place));

      const marker = new maplibregl.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat([place.lng, place.lat])
        .addTo(mapRef.current!);

      markers.push(marker);
    });

    return () => {
      markers.forEach((m) => m.remove());
    };
  }, [handleMarkerClick]);

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
      {/* 地图区域 */}
      <div ref={containerRef} style={{ flex: 1, height: "100%" }} />

      {/* 右侧诗词面板 */}
      <div
        className="poem-panel"
        style={{
          width: 400,
          height: "100%",
          background: "#faf8f3",
          borderLeft: "1px solid #e0d8c8",
          overflowY: "auto",
          transition: "transform 0.3s ease",
        }}
      >
        {selected ? (
          <div style={{ padding: "24px" }}>
            {/* 标题栏 */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h2
                style={{
                  fontSize: "24px",
                  color: "#3a2f1a",
                  fontWeight: 600,
                }}
              >
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

            {/* 统计 */}
            <p
              style={{
                color: "#8b6914",
                fontSize: "14px",
                marginBottom: "24px",
              }}
            >
              共 {selected.poems.length} 首诗词
            </p>

            {/* 诗词列表 */}
            {selected.poems.map((poem, i) => (
              <div
                key={i}
                style={{
                  marginBottom: "28px",
                  paddingBottom: "20px",
                  borderBottom: "1px solid #e8e0d0",
                }}
              >
                <h3
                  style={{
                    fontSize: "17px",
                    color: "#3a2f1a",
                    marginBottom: "6px",
                  }}
                >
                  {poem.title}
                </h3>
                <p
                  style={{
                    color: "#8b6914",
                    fontSize: "13px",
                    marginBottom: "12px",
                  }}
                >
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
        ) : (
          <div
            style={{
              padding: "40px 24px",
              color: "#8b6914",
              textAlign: "center",
            }}
          >
            <h2
              style={{
                fontSize: "22px",
                color: "#3a2f1a",
                marginBottom: "16px",
              }}
            >
              🗺️ 中国古诗词地图
            </h2>
            <p style={{ fontSize: "15px", lineHeight: 1.8, color: "#6a5a3a" }}>
              点击地图上的任意标记，探索这片土地上的诗词
            </p>
            <div
              style={{
                marginTop: "32px",
                fontSize: "13px",
                color: "#a09070",
              }}
            >
              <p>共收录 {places.length} 个城市</p>
              <p>
                {places.reduce((sum, p) => sum + p.poems.length, 0)} 首精选诗词
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
