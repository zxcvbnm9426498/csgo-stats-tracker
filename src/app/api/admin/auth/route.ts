import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, addLog } from '../db';
import { cookies } from 'next/headers';

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
      
      const admin = await verifyAdmin(username, password);
      if (!admin) {
        await addLog({
          action: 'LOGIN_FAILED',
          details: `尝试使用用户名 ${username} 登录失败`,
          ip: request.headers.get('x-forwarded-for') || 'unknown'
        });
        
        return NextResponse.json(
          { success: false, message: '用户名或密码错误' },
          { status: 401 }
        );
      }
      
      // 创建会话
      const sessionId = crypto.randomUUID();
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时
      
      const cookieStore = await cookies();
      cookieStore.set('admin_session', sessionId, {
        expires,
        httpOnly: true,
        path: '/',
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production'
      });
      
      // 记录登录日志
      await addLog({
        action: 'LOGIN_SUCCESS',
        details: `管理员 ${username} 登录成功`,
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      
      return NextResponse.json({
        success: true,
        message: '登录成功',
        admin: {
          id: admin.id,
          username: admin.username,
          role: admin.role
        }
      });
    }
    
    if (action === 'logout') {
      // 清除cookie
      const cookieStore = await cookies();
      cookieStore.delete('admin_session');
      
      return NextResponse.json({
        success: true,
        message: '已退出登录'
      });
    }
    
    return NextResponse.json(
      { success: false, message: '未知操作' },
      { status: 400 }
    );
  } catch (error) {
    console.error('管理员认证错误:', error);
    return NextResponse.json(
      { success: false, message: '服务器内部错误' },
      { status: 500 }
    );
  }
} 