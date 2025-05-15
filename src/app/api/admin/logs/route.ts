import { NextRequest, NextResponse } from 'next/server';
import { getLogs, addLog } from '@/app/api/admin/db';
import { cookies } from 'next/headers';

// 简单的中间件函数，检查管理员是否已登录
async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const session = request.cookies.get('admin_session');
  return !!session && !!session.value;
}

export async function GET(request: NextRequest) {
  try {
    // 改进会话验证
    if (!await isAuthenticated(request)) {
      console.log('[日志API] 未授权访问，找不到有效会话');
      
      // 设置正确的响应头以允许客户端处理401
      const headers = new Headers();
      headers.append('Content-Type', 'application/json');
      headers.append('Cache-Control', 'no-store');
      
      return NextResponse.json({ 
        success: false, 
        message: '未登录或会话已过期',
        timestamp: new Date().toISOString()
      }, { 
        status: 401,
        headers
      });
    }

    // 获取查询参数
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const action = url.searchParams.get('action') || undefined;
    const startDate = url.searchParams.get('startDate') || undefined;
    const endDate = url.searchParams.get('endDate') || undefined;

    // 获取日志
    const result = await getLogs({
      page,
      limit,
      action,
      startDate,
      endDate
    });
    
    // 设置响应头
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');
    headers.append('Cache-Control', 'no-store');
    
    return NextResponse.json({
      success: true,
      data: result
    }, {
      headers
    });
  } catch (error) {
    console.error('获取日志错误:', error);
    return NextResponse.json({ 
      success: false,
      message: '获取日志失败',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // 改进会话验证
    if (!await isAuthenticated(request)) {
      return NextResponse.json({ 
        success: false, 
        message: '未登录或会话已过期'
      }, { status: 401 });
    }

    // 获取请求数据
    const body = await request.json();
    const { action, details, userId } = body;
    
    if (!action || !details) {
      return NextResponse.json({ 
        success: false, 
        message: '缺少必要字段' 
      }, { status: 400 });
    }
    
    // 创建日志
    const log = await addLog({
      action,
      details,
      userId,
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });
    
    return NextResponse.json({
      success: true,
      data: { log }
    });
  } catch (error) {
    console.error('创建日志错误:', error);
    return NextResponse.json({ 
      success: false,
      message: '创建日志失败',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 