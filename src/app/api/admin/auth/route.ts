import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, addLog, createSession, getAdmins, testConnection, hashPassword } from '@/lib/edge-config';
import { sql } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { action, username, password } = data;
    
    // 创建调试信息对象
    const debugInfo = {
      action,
      username: username ? username : '未提供',
      passwordProvided: !!password,
      timestamp: new Date().toISOString(),
      connectionTest: null as any,
      adminCount: 0,
      hashTest: password ? hashPassword(password).substring(0, 10) + '...' : '未计算',
      error: null as string | null
    };
    
    // 测试数据库连接
    debugInfo.connectionTest = await testConnection();
    
    if (action === 'login') {
      console.log(`[Auth API] 登录尝试: 用户名=${username}, 提供密码=${!!password}`);
      
      if (!username || !password) {
        return NextResponse.json(
          { 
            success: false, 
            message: '用户名和密码不能为空',
            debug: debugInfo
          },
          { status: 400 }
        );
      }
      
      // 直接从数据库查询管理员账户
      const adminResult = await sql`SELECT * FROM admins WHERE username = ${username}`;
      console.log(`[Auth API] 找到管理员账户: ${adminResult.length}个`);
      
      debugInfo.adminCount = adminResult.length;
      
      // 如果数据库中没有管理员，使用getAdmins再次尝试
      if (adminResult.length === 0) {
        const admins = await getAdmins();
        debugInfo.adminCount = admins.length;
        
        if (admins.length === 0) {
          console.log('[Auth API] 无管理员账户，需要初始化数据库');
          return NextResponse.json(
            { 
              success: false, 
              message: '系统未初始化，请联系管理员',
              debug: debugInfo
            },
            { status: 500 }
          );
        }
      }
      
      // 验证管理员身份
      if (adminResult.length > 0) {
        const admin = adminResult[0];
        const hashedInputPassword = hashPassword(password);
        
        console.log(`[Auth API] 检查密码匹配: 
          数据库密码: ${admin.password.substring(0, 10)}...
          输入哈希: ${hashedInputPassword.substring(0, 10)}...
        `);
        
        if (admin.password === hashedInputPassword || admin.password === password) {
          // 密码正确
          // 记录登录尝试
          await addLog({
            action: 'LOGIN_SUCCESS',
            details: `管理员 ${username} 登录成功`,
            ip: request.headers.get('x-forwarded-for') || 'unknown'
          });
          
          // 创建会话
          const userAgent = request.headers.get('user-agent') || '';
          const ip = request.headers.get('x-forwarded-for') || 'unknown';
          const session = await createSession(admin.id.toString(), userAgent, ip);
          
          // 创建响应
          const response = NextResponse.json({
            success: true,
            message: '登录成功',
            admin: {
              id: admin.id,
              username: admin.username,
              role: admin.role || 'admin'
            }
          });

          // 确保设置正确的cookie，修复cookie设置
          const expirationDate = new Date();
          expirationDate.setTime(expirationDate.getTime() + 24 * 60 * 60 * 1000); // 24小时后过期
          
          response.cookies.set({
            name: 'admin_session',
            value: session.id,
            expires: expirationDate,
            httpOnly: true,
            path: '/',
            sameSite: 'lax', // 改为lax以支持跨页面导航
            secure: process.env.NODE_ENV === 'production'
          });
          
          console.log(`[Auth API] 成功创建会话: ${session.id}, 过期时间: ${expirationDate.toISOString()}`);
          return response;
        } else {
          // 密码错误
          await addLog({
            action: 'LOGIN_FAILED',
            details: `尝试使用用户名 ${username} 登录失败 (密码错误)`,
            ip: request.headers.get('x-forwarded-for') || 'unknown'
          });
          
          debugInfo.error = '密码错误';
          return NextResponse.json(
            { 
              success: false, 
              message: '用户名或密码错误',
              debug: debugInfo
            },
            { status: 401 }
          );
        }
      } else {
        // 用户不存在
        await addLog({
          action: 'LOGIN_FAILED',
          details: `尝试使用不存在的用户名 ${username} 登录失败`,
          ip: request.headers.get('x-forwarded-for') || 'unknown'
        });
        
        debugInfo.error = '用户名不存在';
        return NextResponse.json(
          { 
            success: false, 
            message: '用户名或密码错误',
            debug: debugInfo
          },
          { status: 401 }
        );
      }
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
      { success: false, message: '未知操作', debug: debugInfo },
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