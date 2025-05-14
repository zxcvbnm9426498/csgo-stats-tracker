import type { Metadata } from "next";
import { Inter } from 'next/font/google';
import "./globals.css";
import "./styles/modal.css";
import InitDB from "./components/InitDB";

const inter = Inter({ subsets: ['latin'] });

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
      <body className={inter.className}>
        <InitDB />
        {children}
      </body>
    </html>
  );
}
