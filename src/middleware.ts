import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/edge-config';

export async function middleware(request: NextRequest) {
  // 获取路径
  const path = request.nextUrl.pathname;
  
  // 检查是否为需要保护的管理员路径
  const isAdminPath = path.startsWith('/admin') && path !== '/admin';
  
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
  
  // 对于所有其他路径，继续正常处理
  return NextResponse.next();
}

// 仅为后台管理页面路径配置中间件
export const config = {
  matcher: ['/admin/:path*']
}; 