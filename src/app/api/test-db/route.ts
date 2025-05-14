import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // 获取当前环境信息
    const environment = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV || '未设置',
      DATABASE_URL_SET: process.env.DATABASE_URL ? '已设置' : '未设置',
      POSTGRES_PRISMA_URL_SET: process.env.POSTGRES_PRISMA_URL ? '已设置' : '未设置',
      DATABASE_URL_UNPOOLED_SET: process.env.DATABASE_URL_UNPOOLED ? '已设置' : '未设置',
      PGHOST_SET: process.env.PGHOST ? '已设置' : '未设置'
    };

    // 尝试与数据库建立连接
    try {
      // 测试Admin表
      const adminCount = await prisma.admin.count();
      
      // 如果没有管理员账号，尝试创建一个
      if (adminCount === 0) {
        await prisma.admin.create({
          data: {
            username: 'admin',
            password: 'admin123',
            role: 'admin'
          }
        });
      }
      
      // 测试其他表
      const accountCount = await prisma.account.count();
      const logCount = await prisma.log.count();
      
      // 尝试添加一条日志记录
      const testLog = await prisma.log.create({
        data: {
          action: 'TEST_DB_CONNECTION',
          details: '数据库连接测试',
          ip: request.headers.get('x-forwarded-for') || 'unknown'
        }
      });
      
      return NextResponse.json({ 
        success: true, 
        message: '数据库连接成功',
        environment,
        counts: {
          admins: adminCount,
          accounts: accountCount,
          logs: logCount + 1 // 包括我们刚刚创建的测试日志
        },
        testLogId: testLog.id
      });
    } catch (dbError) {
      throw new Error(`数据库操作失败: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
    }
  } catch (error) {
    console.error('数据库连接测试失败:', error);
    
    // 获取错误详情但不泄露敏感信息
    const errorDetails = error instanceof Error 
      ? { 
          name: error.name,
          message: error.message
        }
      : String(error);
    
    return NextResponse.json({ 
      success: false, 
      message: '数据库连接失败',
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV || '未设置',
        DATABASE_URL_SET: process.env.DATABASE_URL ? '已设置' : '未设置',
        POSTGRES_PRISMA_URL_SET: process.env.POSTGRES_PRISMA_URL ? '已设置' : '未设置',
        DATABASE_URL_UNPOOLED_SET: process.env.DATABASE_URL_UNPOOLED ? '已设置' : '未设置',
        PGHOST_SET: process.env.PGHOST ? '已设置' : '未设置'
      },
      error: errorDetails
    }, { status: 500 });
  }
} 