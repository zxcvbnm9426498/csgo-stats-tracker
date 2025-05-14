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
      
      // 调试信息
      const debugInfo = {
        method: 'admin/auth POST',
        action,
        username,
        passwordLength: password ? password.length : 0,
        dbConnectionTest: false,
        dbType: process.env.NODE_ENV === 'production' ? 'PostgreSQL' : 'SQLite',
        verifyAdminAttempted: false,
        sqlQueryAttempted: false,
        errors: [] as string[]
      };
      
      // 测试数据库连接
      try {
        const dbTest = await prisma.$queryRaw`SELECT 1 as connected`;
        debugInfo.dbConnectionTest = Array.isArray(dbTest) && dbTest.length > 0;
      } catch (dbError) {
        debugInfo.errors.push(`DB连接测试失败: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
      }
      
      // 尝试使用两种方式验证管理员
      let admin: Admin | null = null;
      
      // 方式1: 通过 verifyAdmin 函数验证
      try {
        debugInfo.verifyAdminAttempted = true;
        admin = await verifyAdmin(username, password);
      } catch (error) {
        debugInfo.errors.push(`verifyAdmin错误: ${error instanceof Error ? error.message : String(error)}`);
        console.error('verifyAdmin 方法错误:', error);
        // 如果 verifyAdmin 失败，继续尝试方式2
      }
      
      // 方式2: 直接使用 SQL 查询验证
      if (!admin) {
        try {
          debugInfo.sqlQueryAttempted = true;
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
          } else {
            debugInfo.errors.push(`SQL查询未返回结果，用户名或密码错误`);
            
            // 检查用户是否存在
            // @ts-ignore
            const userCheck = await prisma.$queryRaw`
              SELECT id FROM "Admin" WHERE username = ${username} LIMIT 1
            `;
            if (userCheck && userCheck.length > 0) {
              debugInfo.errors.push(`用户名存在但密码错误`);
            } else {
              debugInfo.errors.push(`用户名不存在`);
            }
          }
        } catch (sqlError) {
          debugInfo.errors.push(`SQL验证错误: ${sqlError instanceof Error ? sqlError.message : String(sqlError)}`);
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
            NOW()
          )
        `;
      } catch (logError) {
        debugInfo.errors.push(`日志记录错误: ${logError instanceof Error ? logError.message : String(logError)}`);
        console.error('创建日志错误:', logError);
        // 日志记录失败不影响主要流程
      }
      
      if (!admin) {
        return NextResponse.json(
          { 
            success: false, 
            message: '用户名或密码错误',
            debug: process.env.NODE_ENV === 'development' ? debugInfo : undefined
          },
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