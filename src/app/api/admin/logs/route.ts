import { NextRequest, NextResponse } from 'next/server';
import { getLogs, addLog } from '@/lib/edge-config';
import { cookies } from 'next/headers';

// 简单的中间件函数，检查管理员是否已登录
async function isAuthenticated(): Promise<boolean> {
  // 在实际项目中，应该验证session的有效性，这里简化处理
  return (await cookies()).has('admin_session');
}

export async function GET(request: NextRequest) {
  try {
    // 简单的会话验证
    const session = request.cookies.get('admin_session');
    if (!session || !session.value) {
      return NextResponse.json({ 
        success: false, 
        message: '未登录' 
      }, { status: 401 });
    }

    // 获取日志
    const logs = await getLogs();
    
    return NextResponse.json({
      success: true,
      logs
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
    // 简单的会话验证
    const session = request.cookies.get('admin_session');
    if (!session || !session.value) {
      return NextResponse.json({ 
        success: false, 
        message: '未登录' 
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
      log
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