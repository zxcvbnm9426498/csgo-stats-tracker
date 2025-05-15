/*
 * @Author: 择安网络
 * @Code function: 
 * @Date: 2025-05-15 08:45:19
 * @FilePath: /csgo-stats-tracker/src/app/api/init-db/route.ts
 * @LastEditTime: 2025-05-15 08:47:40
 */
import { NextRequest, NextResponse } from 'next/server';
import { addLog } from '@/app/api/admin/db';
import { initDatabase } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // 获取密钥（简单的安全措施）
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    
    // 验证密钥
    if (key !== process.env.DB_INIT_KEY && key !== 'development-init-key') {
      return NextResponse.json({
        success: false,
        message: '未授权访问'
      }, { status: 401 });
    }
    
    console.log('执行数据库初始化...');
    
    // 初始化数据库结构
    await initDatabase();
    
    // 添加初始化日志
    await addLog({
      action: 'SYSTEM_INIT',
      details: '系统初始化',
      ip: 'localhost'
    });
    
    return NextResponse.json({
      success: true,
      message: '数据库初始化成功'
    });
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