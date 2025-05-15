/*
 * @Author: 择安网络
 * @Code function: 
 * @Date: 2025-05-15 08:45:19
 * @FilePath: /csgo-stats-tracker/src/app/api/init-db/route.ts
 * @LastEditTime: 2025-05-15 08:47:40
 */
import { NextResponse } from 'next/server';
import { addLog } from '@/app/api/admin/db';
import { initDatabase } from '@/lib/db';

export async function GET() {
  try {
    console.log('执行数据库初始化...');
    
    // 初始化数据库结构
    await initDatabase();
    
    // 添加初始化日志
    await addLog({
      action: 'SYSTEM_INIT',
      details: '系统初始化',
      ip: 'localhost'
    });
    
    // 设置响应头，确保字符编码正确
    const headers = new Headers();
    headers.append("Content-Type", "application/json; charset=utf-8");
    
    return new NextResponse(
      JSON.stringify({
        success: true,
        message: "数据库初始化成功",
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers
      }
    );
  } catch (error) {
    console.error('数据库初始化失败:', error);
    
    // 错误响应也添加正确的头部
    const headers = new Headers();
    headers.append("Content-Type", "application/json; charset=utf-8");
    
    return new NextResponse(
      JSON.stringify({ 
        success: false, 
        message: '数据库初始化失败',
        error: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500,
        headers
      }
    );
  }
} 