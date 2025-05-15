import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { addLog } from '@/app/api/admin/db';

/**
 * 修复数据库结构的API端点
 */
export async function GET(request: NextRequest) {
  try {
    console.log('开始修复数据库结构...');
    
    // 记录请求
    await addLog({
      action: 'FIX_DATABASE',
      details: '尝试修复数据库结构',
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });
    
    // 1. 检查accounts表是否存在
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'accounts'
      ) as exists
    `;
    
    if (!tableExists[0].exists) {
      console.log('accounts表不存在，需要创建');
      await sql`
        CREATE TABLE accounts (
          id SERIAL PRIMARY KEY,
          username VARCHAR(100) NOT NULL,
          "userId" VARCHAR(50),
          "steamId" VARCHAR(50),
          phone VARCHAR(50),
          status VARCHAR(20) DEFAULT 'active',
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          "lastLogin" TIMESTAMP WITH TIME ZONE
        )
      `;
      
      console.log('成功创建accounts表');
      return NextResponse.json({
        success: true,
        message: '成功创建accounts表',
        changes: ['创建了accounts表']
      }, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        }
      });
    }
    
    // 2. 检查accounts表结构
    console.log('检查accounts表结构...');
    const changes: string[] = [];
    
    // 检查userId列是否存在
    const userIdExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'accounts'
        AND column_name = 'userId'
      ) as exists
    `;
    
    if (!userIdExists[0].exists) {
      console.log('添加userId列...');
      await sql`ALTER TABLE accounts ADD COLUMN "userId" VARCHAR(50)`;
      changes.push('添加了userId列');
    }
    
    // 检查phone列是否允许NULL
    const phoneNullable = await sql`
      SELECT is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      AND table_name = 'accounts'
      AND column_name = 'phone'
    `;
    
    if (phoneNullable.length > 0 && phoneNullable[0].is_nullable === 'NO') {
      console.log('修改phone列为可空...');
      await sql`ALTER TABLE accounts ALTER COLUMN phone DROP NOT NULL`;
      changes.push('修改phone列为可空');
    }
    
    // 创建唯一索引
    try {
      console.log('添加唯一索引...');
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS accounts_username_unique ON accounts(username)`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS accounts_userId_unique ON accounts("userId") WHERE "userId" IS NOT NULL`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS accounts_phone_unique ON accounts(phone) WHERE phone IS NOT NULL`;
      changes.push('更新了唯一索引');
    } catch (indexError) {
      console.error('创建索引失败:', indexError);
      changes.push(`创建索引失败: ${indexError instanceof Error ? indexError.message : String(indexError)}`);
    }
    
    // 添加记录示例
    if (changes.length === 0) {
      console.log('数据库结构已经正确，无需修改');
      return NextResponse.json({
        success: true,
        message: '数据库结构已经正确，无需修改',
        changes: []
      }, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        }
      });
    }
    
    console.log('数据库修复完成，变更:', changes);
    return NextResponse.json({
      success: true,
      message: '数据库修复完成',
      changes
    }, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });
    
  } catch (error) {
    console.error('修复数据库结构失败:', error);
    return NextResponse.json({
      success: false,
      message: '修复数据库结构失败',
      error: error instanceof Error ? error.message : String(error)
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });
  }
} 