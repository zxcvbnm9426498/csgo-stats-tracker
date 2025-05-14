'use client';

import { useEffect } from 'react';

// 数据库初始化客户端组件
export default function InitDB() {
  useEffect(() => {
    // 应用启动时初始化数据库
    const initDb = async () => {
      try {
        console.log('初始化数据库...');
        const response = await fetch('/api/init-db');
        const data = await response.json();
        console.log('数据库初始化结果:', data);
      } catch (error) {
        console.error('数据库初始化失败:', error);
      }
    };

    initDb();
  }, []);

  // 此组件不渲染任何内容
  return null;
} 