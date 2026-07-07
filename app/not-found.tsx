import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        fontFamily: '"Noto Serif SC", "SimSun", serif',
        background: "#faf8f3",
        color: "#3a2f1a",
      }}
    >
      <h1 style={{ fontSize: "64px", marginBottom: "16px", color: "#8b6914" }}>
        404
      </h1>
      <p style={{ fontSize: "18px", marginBottom: "24px" }}>
        此页已随黄鹤一去不复返
      </p>
      <Link
        href="/"
        style={{
          color: "#8b6914",
          textDecoration: "none",
          border: "1px solid #8b6914",
          padding: "8px 20px",
          borderRadius: "4px",
        }}
      >
        返回地图
      </Link>
    </div>
  );
}
