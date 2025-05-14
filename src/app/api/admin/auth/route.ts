import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, addLog, Admin } from '../db';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

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
      
      // 尝试使用两种方式验证管理员
      let admin: Admin | null = null;
      
      // 方式1: 通过 verifyAdmin 函数验证
      try {
        admin = await verifyAdmin(username, password);
      } catch (error) {
        console.error('verifyAdmin 方法错误:', error);
        // 如果 verifyAdmin 失败，继续尝试方式2
      }
      
      // 方式2: 直接使用 SQL 查询验证
      if (!admin) {
        try {
          // @ts-ignore - 直接SQL查询
          const results = await prisma.$queryRaw`
            SELECT id, username, role, "createdAt" 
            FROM "Admin" 
            WHERE username = ${username} AND password = ${password}
            LIMIT 1
          `;
          
          if (results && results.length > 0) {
            admin = {
              id: results[0].id,
              username: results[0].username,
              role: results[0].role,
              password: '', // 不返回密码，但需要满足类型
              createdAt: results[0].createdAt.toISOString()
            };
          }
        } catch (sqlError) {
          console.error('SQL 验证错误:', sqlError);
        }
      }
      
      // 记录登录尝试
      try {
        // 直接SQL插入日志记录
        // @ts-ignore
        await prisma.$executeRaw`
          INSERT INTO "Log" (id, action, details, ip, timestamp)
          VALUES (
            ${crypto.randomUUID()},
            ${admin ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED'},
            ${admin ? `管理员 ${username} 登录成功` : `尝试使用用户名 ${username} 登录失败`},
            ${request.headers.get('x-forwarded-for') || 'unknown'},
            datetime('now')
          )
        `;
      } catch (logError) {
        console.error('创建日志错误:', logError);
        // 日志记录失败不影响主要流程
      }
      
      if (!admin) {
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
      { 
        success: false, 
        message: '服务器内部错误',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 