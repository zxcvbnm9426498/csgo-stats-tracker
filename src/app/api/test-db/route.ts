import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // 获取当前环境信息
    const environment = {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL_SET: process.env.DATABASE_URL ? '已设置' : '未设置',
      POSTGRES_PRISMA_URL_SET: process.env.POSTGRES_PRISMA_URL ? '已设置' : '未设置',
      DATABASE_URL_UNPOOLED_SET: process.env.DATABASE_URL_UNPOOLED ? '已设置' : '未设置',
      PGHOST_SET: process.env.PGHOST ? '已设置' : '未设置'
    };

    // 尝试简单查询以验证连接
    const isPrismaConnected = !!prisma;
    let dbCounts = { admins: 0, accounts: 0, logs: 0 };
    
    // 尝试实际查询
    if (isPrismaConnected) {
      try {
        const adminCount = await prisma.admin.count();
        const accountCount = await prisma.account.count();
        const logCount = await prisma.log.count();
        
        dbCounts = {
          admins: adminCount,
          accounts: accountCount,
          logs: logCount
        };
        
        // 如果没有管理员，尝试创建默认管理员
        if (adminCount === 0) {
          await prisma.admin.create({
            data: {
              username: 'admin',
              password: 'admin123',
              role: 'admin'
            }
          });
          dbCounts.admins = 1;
        }
        
        return NextResponse.json({ 
          success: true, 
          message: '数据库连接成功',
          environment,
          isPrismaConnected,
          dbCounts
        });
      } catch (dbQueryError) {
        // 数据库查询异常
        throw new Error(`数据库查询失败: ${dbQueryError instanceof Error ? dbQueryError.message : String(dbQueryError)}`);
      }
    } else {
      throw new Error('Prisma客户端不可用');
    }
  } catch (error) {
    console.error('数据库连接测试失败:', error);
    
    // 获取错误详细信息但避免暴露完整栈追踪
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
        DATABASE_URL_SET: process.env.DATABASE_URL ? '已设置' : '未设置',
        POSTGRES_PRISMA_URL_SET: process.env.POSTGRES_PRISMA_URL ? '已设置' : '未设置',
        DATABASE_URL_UNPOOLED_SET: process.env.DATABASE_URL_UNPOOLED ? '已设置' : '未设置',
        PGHOST_SET: process.env.PGHOST ? '已设置' : '未设置'
      },
      isPrismaClientAvailable: !!prisma,
      error: errorDetails
    }, { status: 500 });
  }
} 