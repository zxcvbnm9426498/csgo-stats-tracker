import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/edge-config';
import { sql } from '@/lib/db';

// 需要验证令牌的API路径前缀
const API_PREFIXES = [
  '/api/stats/',
  '/api/elo/',
  '/api/bans/',
  '/api/matches/'
];

// 不需要验证令牌的API路径
const EXCLUDED_PATHS = [
  '/api/auth/verify-token',
  '/api/token/get-public-token',
  '/api/init-db'
];

export const config = {
  matcher: [
    '/api/elo/:path*',
    '/api/bans/:path*',
  ],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 检查是否为需要保护的管理员路径
  const isAdminPath = pathname.startsWith('/admin') && pathname !== '/admin';
  
  // 如果是管理页面路径，检查会话
  if (isAdminPath) {
    const sessionCookie = request.cookies.get('admin_session');
    
    // 如果没有会话，重定向到登录
    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    
    // 验证会话有效性
    const { valid } = await verifySession(sessionCookie.value);
    if (!valid) {
      // 会话无效，重定向到登录页
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }
  
  // 获取API令牌并验证
  const token = request.headers.get('x-api-token');

  if (!token) {
    return NextResponse.json(
      { success: false, message: '未授权访问' },
      { status: 401 }
    );
  }

  try {
    // 验证令牌是否有效
    const validTokens = await sql`
      SELECT * FROM api_tokens 
      WHERE token = ${token} 
      AND status = 'active' 
      AND token_expiry > CURRENT_TIMESTAMP
    `;

    if (!validTokens || validTokens.length === 0) {
      return NextResponse.json(
        { success: false, message: '无效的API令牌' },
        { status: 401 }
      );
    }

    // 更新令牌最后使用时间
    await sql`
      UPDATE api_tokens 
      SET last_used = CURRENT_TIMESTAMP 
      WHERE token = ${token}
    `;

    // 允许请求继续
    return NextResponse.next();
  } catch (error) {
    console.error('验证API令牌失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '验证令牌时出错',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 