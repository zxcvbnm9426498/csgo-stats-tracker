import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, addLog, createSession } from '@/lib/edge-config';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { action, username, password } = data;
    
    if (action === 'login') {
      if (!username || !password) {
        return NextResponse.json(
          { success: false, message: '用户名和密码不能为空' },
          { status: 400 }
        );
      }
      
      // 验证管理员身份
      const admin = await verifyAdmin(username, password);

      // 记录登录尝试
      await addLog({
        action: admin ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
        details: admin ? `管理员 ${username} 登录成功` : `尝试使用用户名 ${username} 登录失败`,
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      
      if (!admin) {
        return NextResponse.json(
          { 
            success: false, 
            message: '用户名或密码错误'
          },
          { status: 401 }
        );
      }
      
      // 创建会话
      const userAgent = request.headers.get('user-agent') || '';
      const ip = request.headers.get('x-forwarded-for') || 'unknown';
      const session = await createSession(admin.id, userAgent, ip);
      
      // 创建响应
      const response = NextResponse.json({
        success: true,
        message: '登录成功',
        admin: {
          id: admin.id,
          username: admin.username,
          role: admin.role
        }
      });

      // 设置session cookie
      response.cookies.set({
        name: 'admin_session',
        value: session.id,
        expires: new Date(session.expiresAt),
        httpOnly: true,
        path: '/',
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production'
      });
      
      return response;
    }
    
    if (action === 'logout') {
      // 清除cookie
      const response = NextResponse.json({
        success: true,
        message: '已退出登录'
      });
      
      response.cookies.delete('admin_session');
      
      return response;
    }
    
    return NextResponse.json(
      { success: false, message: '未知操作' },
      { status: 400 }
    );
  } catch (error) {
    console.error('管理员认证错误:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '服务器内部错误',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 