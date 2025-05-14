import { NextRequest, NextResponse } from 'next/server';
import { getAdmins, hashPassword } from '@/lib/edge-config';

// 直接操作Edge Config对象的API，用于紧急重置管理员密码
export async function POST(request: NextRequest) {
  try {
    // 安全检查 - 只允许在开发环境或提供正确的紧急恢复密钥时使用
    const isDevEnv = process.env.NODE_ENV === 'development';
    const recoveryKey = request.headers.get('x-recovery-key') || '';
    const expectedRecoveryKey = process.env.ADMIN_RECOVERY_KEY || 'urgent-recovery-key-2024';
    
    const isAuthorized = isDevEnv || recoveryKey === expectedRecoveryKey;
    
    if (!isAuthorized) {
      return NextResponse.json({ 
        success: false, 
        message: '未授权访问' 
      }, { status: 401 });
    }
    
    const data = await request.json();
    const { username, newPassword } = data;
    
    if (!username || !newPassword) {
      return NextResponse.json({ 
        success: false, 
        message: '用户名和新密码不能为空' 
      }, { status: 400 });
    }
    
    // 获取Edge Config客户端
    const edgeConfig = await import('@vercel/edge-config').then(m => m.createClient(process.env.EDGE_CONFIG || ''));
    
    // 获取所有管理员
    const admins = await getAdmins();
    
    if (admins.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: '没有管理员账户' 
      }, { status: 404 });
    }
    
    // 查找目标管理员
    const adminIndex = admins.findIndex(a => a.username === username);
    
    if (adminIndex === -1) {
      return NextResponse.json({ 
        success: false, 
        message: '管理员不存在' 
      }, { status: 404 });
    }
    
    // 更新密码
    admins[adminIndex].password = hashPassword(newPassword);
    
    // 保存更改
    await (edgeConfig as any).set('admins', admins);
    
    return NextResponse.json({
      success: true,
      message: '密码已重置',
      username
    });
  } catch (error) {
    console.error('重置密码失败:', error);
    
    return NextResponse.json({ 
      success: false, 
      message: '服务器内部错误',
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
} 