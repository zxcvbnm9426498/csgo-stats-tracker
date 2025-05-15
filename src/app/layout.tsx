import type { Metadata } from "next";
import "./globals.css";
import "./styles/modal.css";
import InitDB from "./components/InitDB";

// 使用系统字体，替代Inter字体
const systemFontClass = 'font-sans';

export const metadata: Metadata = {
  title: "CSGO 玩家战绩查询系统",
  description: "通过ID或Steam ID查询CSGO玩家详细游戏数据和战绩统计",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={systemFontClass}>
        <InitDB />
        {children}
      </body>
    </html>
  );
}
