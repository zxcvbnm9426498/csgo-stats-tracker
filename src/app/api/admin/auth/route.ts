import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, addLog, createSession, getAdmins, testConnection, hashPassword } from '@/lib/edge-config';

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
    
    // 测试Edge Config连接
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
      
      // 获取所有管理员
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
      
      // 验证管理员身份
      const admin = await verifyAdmin(username, password);
      console.log(`[Auth API] 验证结果: ${admin ? '成功' : '失败'}`);
      
      // 记录登录尝试
      await addLog({
        action: admin ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
        details: admin ? `管理员 ${username} 登录成功` : `尝试使用用户名 ${username} 登录失败`,
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      
      if (!admin) {
        // 查找用户是否存在
        const userExists = admins.some(a => a.username === username);
        debugInfo.error = userExists ? '密码错误' : '用户名不存在';
        
        return NextResponse.json(
          { 
            success: false, 
            message: '用户名或密码错误',
            debug: debugInfo
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
      
      console.log(`[Auth API] 成功创建会话: ${session.id}`);
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