import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "A股板块趋势",
  description: "展示A股热门行业板块与概念板块的实时涨跌趋势、数据来源与刷新时间。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}