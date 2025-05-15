import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import crypto from 'crypto';

// 密码加盐哈希函数
function hashPassword(password: string, salt = 'csgo-stats-tracker-salt'): string {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

// 重置管理员密码API
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
    
    // 检查管理员是否存在
    const adminCheck = await sql`SELECT * FROM admins WHERE username = ${username}`;
    
    if (adminCheck.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: '管理员不存在' 
      }, { status: 404 });
    }
    
    // 更新密码 - 使用PostgreSQL
    const hashedPassword = hashPassword(newPassword);
    await sql`
      UPDATE admins 
      SET password = ${hashedPassword} 
      WHERE username = ${username}
    `;
    
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