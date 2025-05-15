import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
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
  '/api/auth/verify-token'
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 检查是否为需要保护的管理员路径
  const isAdminPath = pathname.startsWith('/admin') && pathname !== '/admin';
  
  // 判断是否需要验证API令牌
  const needsApiAuth = API_PREFIXES.some(prefix => pathname.startsWith(prefix)) &&
                     !EXCLUDED_PATHS.includes(pathname);
  
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
  
  // 如果是需要验证令牌的API路径
  if (needsApiAuth) {
    const token = request.headers.get('x-api-token');
    
    // 如果没有提供令牌
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: '缺少API令牌',
          code: 'TOKEN_MISSING'
        },
        { status: 401 }
      );
    }
    
    try {
      // 查询令牌是否存在且有效
      const tokens = await sql`
        SELECT * FROM api_tokens 
        WHERE token = ${token} 
          AND status = 'active' 
          AND token_expiry > CURRENT_TIMESTAMP
      `;
      
      if (tokens.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: '无效的令牌或令牌已过期',
            code: 'INVALID_TOKEN'
          },
          { status: 401 }
        );
      }
      
      // 更新最后使用时间
      await sql`
        UPDATE api_tokens 
        SET last_used = CURRENT_TIMESTAMP 
        WHERE id = ${tokens[0].id}
      `;
    } catch (error) {
      console.error('验证令牌时出错:', error);
      return NextResponse.json(
        {
          success: false,
          message: '验证令牌时发生错误',
          code: 'INTERNAL_ERROR'
        },
        { status: 500 }
      );
    }
  }
  
  // 如果所有验证都通过，继续请求
  return NextResponse.next();
}

// 配置中间件匹配路径
export const config = {
  matcher: [
    // 匹配管理员路径
    '/admin/:path*',
    // 匹配需要验证的API路径
    '/api/:path*',
  ],
}; 