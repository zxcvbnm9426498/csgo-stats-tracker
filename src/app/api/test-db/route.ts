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
      // 测试数据库连接
      await prisma.$queryRaw`SELECT 1 as check_connection`;
      
      // 检查表是否存在
      let adminTableExists = true;
      let accountTableExists = true;
      let logTableExists = true;
      
      try {
        await prisma.admin.findFirst();
      } catch (error) {
        adminTableExists = false;
        console.error('Admin表可能不存在:', error);
      }
      
      try {
        await prisma.account.findFirst();
      } catch (error) {
        accountTableExists = false;
        console.error('Account表可能不存在:', error);
      }
      
      try {
        await prisma.log.findFirst();
      } catch (error) {
        logTableExists = false;
        console.error('Log表可能不存在:', error);
      }
      
      // 如果所有表都存在，继续测试
      if (adminTableExists && accountTableExists && logTableExists) {
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
          message: '数据库连接并操作成功',
          environment,
          tableStatus: {
            admin: adminTableExists ? '存在' : '不存在',
            account: accountTableExists ? '存在' : '不存在',
            log: logTableExists ? '存在' : '不存在'
          },
          counts: {
            admins: adminCount,
            accounts: accountCount,
            logs: logCount + 1 // 包括我们刚刚创建的测试日志
          },
          testLogId: testLog.id
        });
      } else {
        // 有表不存在，返回状态信息
        return NextResponse.json({
          success: false,
          message: '数据库连接成功但表结构不完整',
          environment,
          tableStatus: {
            admin: adminTableExists ? '存在' : '不存在',
            account: accountTableExists ? '存在' : '不存在',
            log: logTableExists ? '存在' : '不存在'
          },
          recommendation: '请执行 `prisma db push` 或等待 postbuild 脚本自动创建表结构'
        }, { status: 500 });
      }
    } catch (dbError) {
      console.error('数据库操作失败:', dbError);
      throw new Error(`数据库操作失败: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
    }
  } catch (error) {
    console.error('数据库连接测试失败:', error);
    
    // 获取错误详情但不泄露敏感信息
    const errorDetails = error instanceof Error 
      ? { 
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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