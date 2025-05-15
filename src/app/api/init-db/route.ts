/*
 * @Author: 择安网络
 * @Code function: 
 * @Date: 2025-05-15 08:45:19
 * @FilePath: /csgo-stats-tracker/src/app/api/init-db/route.ts
 * @LastEditTime: 2025-05-15 08:47:40
 */
import { NextResponse } from 'next/server';
import { addLog } from '@/app/api/admin/db';

export async function GET() {
  try {
    console.log('执行数据库初始化...');
    
    // 添加初始化日志
    await addLog({
      action: 'SYSTEM_INIT',
      details: '系统初始化',
      ip: 'localhost'
    });
    
    return NextResponse.json({
      success: true,
      message: '数据库初始化成功',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('数据库初始化失败:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: '数据库初始化失败',
        error: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
    );
  }
} 