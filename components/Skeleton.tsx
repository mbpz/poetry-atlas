"use client";

export function Skeleton({
  width = "100%",
  height = 16,
  count = 1,
  style,
}: {
  width?: number | string;
  height?: number | string;
  count?: number;
  style?: React.CSSProperties;
}) {
  if (count > 1) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton
            key={i}
            width={i === count - 1 ? "70%" : width}
            height={height}
            style={style}
          />
        ))}
      </div>
    );
  }
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 4,
        background: "linear-gradient(90deg, #e8e0d0 25%, #f5f0e0 50%, #e8e0d0 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
        ...style,
      }}
    />
  );
}

export function PoemCardSkeleton() {
  return (
    <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid #e8e0d0" }}>
      <Skeleton width="60%" height={18} style={{ marginBottom: 8 }} />
      <Skeleton width="40%" height={14} style={{ marginBottom: 12 }} />
      <Skeleton width="100%" height={14} count={2} />
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#faf8f3",
        zIndex: 1,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 48,
            height: 48,
            border: "3px solid #e8e0d0",
            borderTopColor: "#8b6914",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 12px",
          }}
        />
        <p style={{ color: "#8b6914", fontSize: 14 }}>地图加载中…</p>
      </div>
    </div>
  );
}

export function AuthorPanelSkeleton() {
  return (
    <div style={{ padding: 12 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "8px 0",
            borderBottom: "1px solid #f0ebe0",
          }}
        >
          <Skeleton width={80} height={14} />
          <Skeleton width={60} height={12} />
        </div>
      ))}
    </div>
  );
}
