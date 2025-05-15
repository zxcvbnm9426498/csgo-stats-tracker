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
    addLog({
      action: 'UPDATE_DATABASE_SCHEMA',
      details: '执行数据库架构更新',
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    // 1. 检查accounts表是否存在
    let accountsTableExists = false;
    try {
      const tables = await sql`SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'`;
      accountsTableExists = tables.length > 0;
    } catch (error) {
      console.error('[API] 检查accounts表失败:', error);
      return NextResponse.json({
        success: false,
        message: '检查数据库表结构失败',
        error: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }

    if (!accountsTableExists) {
      console.log('[API] accounts表不存在，创建新表...');
      try {
        await sql`
          CREATE TABLE accounts (
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
        console.log('[API] 成功创建accounts表');
      } catch (error) {
        console.error('[API] 创建accounts表失败:', error);
        return NextResponse.json({
          success: false,
          message: '创建accounts表失败',
          error: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
      }
    } else {
      // 2. 检查是否存在authToken和tokenExpiry列
      let columnsInfo;
      try {
        columnsInfo = await sql`PRAGMA table_info(accounts)`;
      } catch (error) {
        console.error('[API] 获取表结构信息失败:', error);
        return NextResponse.json({
          success: false,
          message: '获取表结构信息失败',
          error: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
      }

      const columns = columnsInfo.map(col => col.name?.toLowerCase());
      console.log('[API] 当前账号表列:', columns);

      // 3. 添加缺失的列
      if (!columns.includes('authtoken')) {
        console.log('[API] 添加 authToken 列');
        try {
          await sql`ALTER TABLE accounts ADD COLUMN "authToken" TEXT`;
        } catch (error) {
          console.error('[API] 添加 authToken 列失败:', error);
        }
      }
      
      if (!columns.includes('tokenexpiry')) {
        console.log('[API] 添加 tokenExpiry 列');
        try {
          await sql`ALTER TABLE accounts ADD COLUMN "tokenExpiry" TIMESTAMP`;
        } catch (error) {
          console.error('[API] 添加 tokenExpiry 列失败:', error);
        }
      }
    }

    // 4. 添加索引
    try {
      console.log('[API] 创建或更新索引...');
      await sql`CREATE INDEX IF NOT EXISTS idx_accounts_authToken ON accounts("authToken")`;
      await sql`CREATE INDEX IF NOT EXISTS idx_accounts_tokenExpiry ON accounts("tokenExpiry")`;
      await sql`CREATE INDEX IF NOT EXISTS idx_accounts_steamId ON accounts("steamId")`;
      console.log('[API] 成功创建所有索引');
    } catch (error) {
      console.error('[API] 创建索引失败:', error);
      return NextResponse.json({
        success: false,
        message: '创建索引失败',
        error: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }

    // 5. 检查并修复日志表
    try {
      const logTablesExist = await sql`SELECT name FROM sqlite_master WHERE type='table' AND name='logs'`;
      if (logTablesExist.length === 0) {
        console.log('[API] 创建日志表...');
        await sql`
          CREATE TABLE logs (
            id TEXT PRIMARY KEY,
            "userId" TEXT,
            action TEXT NOT NULL,
            details TEXT,
            ip TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `;
        console.log('[API] 成功创建日志表');
      }
    } catch (error) {
      console.error('[API] 检查/创建日志表失败:', error);
      // 继续执行，不中断流程
    }

    return NextResponse.json({
      success: true,
      message: '数据库结构更新成功',
      details: {
        tablesChecked: ['accounts', 'logs'],
        columnsAdded: ['authToken', 'tokenExpiry'],
        indexesCreated: ['idx_accounts_authToken', 'idx_accounts_tokenExpiry', 'idx_accounts_steamId']
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