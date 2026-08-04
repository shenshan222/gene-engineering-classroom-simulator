import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "基因工程基本操作课堂模拟器",
  description: "限制酶切割、DNA 片段连接和 PCR 引物选择的课堂模拟工具。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
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
