import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { addLog } from '@/app/api/admin/db';

// 检查管理员是否已登录
async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const session = request.cookies.get('admin_session');
  return !!session && !!session.value;
}

export async function POST(request: NextRequest) {
  try {
    // 验证管理员身份
    if (!(await isAuthenticated(request))) {
      return NextResponse.json({
        success: false,
        message: '请先登录'
      }, { status: 401 });
    }

    console.log('[API] 开始更新数据库结构...');
    
    // 记录操作
    try {
      addLog({
        action: 'UPDATE_DATABASE_SCHEMA',
        details: '执行数据库架构更新',
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
    } catch (logError) {
      console.warn('[API] 无法记录日志，可能是日志表不存在:', logError);
      // 继续执行，因为我们将创建日志表
    }

    // 使用直接的创建表语句，如果表已存在则不会有影响
    const updates: string[] = [];

    // 1. 创建accounts表（如果不存在）
    try {
      console.log('[API] 尝试创建accounts表...');
      await sql`
        CREATE TABLE IF NOT EXISTS accounts (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE,
          phone TEXT UNIQUE,
          "userId" TEXT UNIQUE,
          "steamId" TEXT,
          status TEXT DEFAULT 'active',
          "authToken" TEXT,
          "tokenExpiry" TIMESTAMP,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "lastLogin" TIMESTAMP
        )
      `;
      updates.push('accounts表检查/创建');
      console.log('[API] accounts表已创建或已存在');
    } catch (error) {
      console.error('[API] 创建accounts表失败:', error);
      // 继续执行，尝试添加列
    }

    // 2. 添加缺失的列（使用ALTER TABLE ADD COLUMN IF NOT EXISTS，但某些数据库可能不支持IF NOT EXISTS）
    // 因此我们使用try-catch来处理可能的错误
    try {
      console.log('[API] 尝试添加authToken列...');
      await sql`ALTER TABLE accounts ADD COLUMN "authToken" TEXT`;
      updates.push('添加authToken列');
    } catch (error) {
      console.log('[API] 添加authToken列失败，可能已存在:', error);
      // 列可能已存在，继续执行
    }

    try {
      console.log('[API] 尝试添加tokenExpiry列...');
      await sql`ALTER TABLE accounts ADD COLUMN "tokenExpiry" TIMESTAMP`;
      updates.push('添加tokenExpiry列');
    } catch (error) {
      console.log('[API] 添加tokenExpiry列失败，可能已存在:', error);
      // 列可能已存在，继续执行
    }

    // 3. 添加索引
    try {
      console.log('[API] 创建或更新索引...');
      await sql`CREATE INDEX IF NOT EXISTS idx_accounts_authToken ON accounts("authToken")`;
      await sql`CREATE INDEX IF NOT EXISTS idx_accounts_tokenExpiry ON accounts("tokenExpiry")`;
      await sql`CREATE INDEX IF NOT EXISTS idx_accounts_steamId ON accounts("steamId")`;
      updates.push('创建索引');
      console.log('[API] 成功创建所有索引');
    } catch (error) {
      console.error('[API] 创建索引失败:', error);
      // 继续执行，尝试创建日志表
    }

    // 4. 创建日志表（如果不存在）
    try {
      console.log('[API] 尝试创建logs表...');
      await sql`
        CREATE TABLE IF NOT EXISTS logs (
          id TEXT PRIMARY KEY,
          "userId" TEXT,
          action TEXT NOT NULL,
          details TEXT,
          ip TEXT,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      updates.push('logs表检查/创建');
      console.log('[API] logs表已创建或已存在');
    } catch (error) {
      console.error('[API] 创建logs表失败:', error);
      // 继续执行
    }

    // 5. 创建API认证令牌表（如果不存在）
    try {
      console.log('[API] 尝试创建api_tokens表...');
      await sql`
        CREATE TABLE IF NOT EXISTS api_tokens (
          id TEXT PRIMARY KEY,
          phone TEXT,
          verification_code TEXT,
          token TEXT,
          token_expiry TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_used TIMESTAMP,
          source TEXT,
          status TEXT DEFAULT 'active'
        )
      `;
      updates.push('api_tokens表检查/创建');
      
      // 添加索引
      await sql`CREATE INDEX IF NOT EXISTS idx_api_tokens_token ON api_tokens(token)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_api_tokens_phone ON api_tokens(phone)`;
      updates.push('创建api_tokens索引');
      
      console.log('[API] api_tokens表已创建或已存在');
    } catch (error) {
      console.error('[API] 创建api_tokens表失败:', error);
      // 继续执行
    }

    // 返回成功响应
    return NextResponse.json({
      success: true,
      message: '数据库结构更新成功',
      details: {
        updates
      }
    });
  } catch (error) {
    console.error('[API] 更新数据库结构出错:', error);
    return NextResponse.json({
      success: false,
      message: '更新数据库结构时发生错误',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 