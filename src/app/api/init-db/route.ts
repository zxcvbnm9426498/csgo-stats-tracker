import { NextRequest, NextResponse } from 'next/server';
import { initializeData } from '@/lib/edge-config';

// 初始化数据库
export async function GET(request: NextRequest) {
  try {
    // 添加一个简单的安全检查，避免API被公开访问
    const authHeader = request.headers.get('x-api-key') || '';
    const expectedApiKey = process.env.INIT_API_KEY || 'csgo-stats-tracker-init';
    
    if (authHeader !== expectedApiKey) {
      return NextResponse.json({ success: false, message: '未授权访问' }, { status: 401 });
    }
    
    // 初始化数据
    const success = await initializeData();
    
    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: '数据库初始化成功',
        timestamp: new Date().toISOString() 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: '数据库初始化失败',
        timestamp: new Date().toISOString() 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('初始化数据库时出错:', error);
    
    return NextResponse.json({ 
      success: false, 
      message: '服务器内部错误',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 