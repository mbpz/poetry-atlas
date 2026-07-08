"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { PLACE_TYPES, type Place } from "@/lib/supabase";

export default function MapView({
  places,
  onMarkerClick,
}: {
  places: Place[];
  onMarkerClick: (placeId: string) => void;
}) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 初始化（只执行一次）
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

  // 渲染标记
  useEffect(() => {
    if (!mapRef.current) return;
    document.querySelectorAll(".marker").forEach((el) => el.remove());

    places.forEach((place) => {
      const el = document.createElement("div");
      el.className = "marker";
      const icon = PLACE_TYPES[place.type]?.icon || "📍";
      el.innerHTML = `${icon}<br><b>${place.name}</b>`;
      el.addEventListener("click", () => onMarkerClick(place.id));
      new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([place.lng, place.lat])
        .addTo(mapRef.current!);
    });
  }, [places, onMarkerClick]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
