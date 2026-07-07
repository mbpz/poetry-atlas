import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "中国古诗词地图",
  description: "在地图上阅读中国，在诗词中穿越历史。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
