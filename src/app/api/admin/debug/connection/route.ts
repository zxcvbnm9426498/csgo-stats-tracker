import { NextRequest, NextResponse } from 'next/server';
import { testConnection } from '@/lib/edge-config';

export async function GET(request: NextRequest) {
  try {
    // 简单的安全检查
    const authHeader = request.headers.get('x-api-key') || '';
    const expectedApiKey = process.env.INIT_API_KEY || 'csgo-stats-tracker-init';
    
    if (authHeader !== expectedApiKey) {
      return NextResponse.json({ success: false, message: '未授权访问' }, { status: 401 });
    }
    
    // 测试Edge Config连接
    const connectionStatus = await testConnection();
    
    // 获取环境变量信息（脱敏）
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV || '未设置',
      VERCEL_ENV: process.env.VERCEL_ENV || '未设置',
      EDGE_CONFIG: process.env.EDGE_CONFIG ? '已设置' : '未设置',
      PASSWORD_SALT: process.env.PASSWORD_SALT ? '已设置' : '未设置',
      INIT_API_KEY: process.env.INIT_API_KEY ? '已设置' : '未设置'
    };
    
    return NextResponse.json({
      success: true,
      connectionStatus,
      environment: envInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('检查连接状态时出错:', error);
    
    return NextResponse.json({ 
      success: false, 
      message: '服务器内部错误',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 