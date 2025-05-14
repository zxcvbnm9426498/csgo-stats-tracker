import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import prisma from '@/lib/prisma';

const execPromise = promisify(exec);

export async function GET(request: NextRequest) {
  try {
    // 设置响应头确保正确的字符编码
    const headers = new Headers();
    headers.set('Content-Type', 'application/json; charset=utf-8');
    
    // 获取当前环境信息
    const environment = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV || '未设置',
      DATABASE_URL_SET: process.env.DATABASE_URL ? '已设置' : '未设置'
    };

    // 记录当前表状态
    let adminTableExists = true;
    let accountTableExists = true;
    let logTableExists = true;
    
    try {
      await prisma.admin.findFirst();
    } catch (error) {
      adminTableExists = false;
    }
    
    try {
      await prisma.account.findFirst();
    } catch (error) {
      accountTableExists = false;
    }
    
    try {
      await prisma.log.findFirst();
    } catch (error) {
      logTableExists = false;
    }

    // 尝试使用Prisma的内部方法执行db push
    try {
      // 直接在Prisma Client上执行_executeRequest方法 (不是标准API，可能在不同版本行为不同)
      // @ts-ignore - 忽略类型检查，因为这是内部方法
      await prisma._engine.getDmmf();
      
      const tableStatus: {
        before: {
          admin: string;
          account: string;
          log: string;
        };
        after: {
          log?: string;
        };
      } = {
        before: {
          admin: adminTableExists ? '存在' : '不存在',
          account: accountTableExists ? '存在' : '不存在',
          log: logTableExists ? '存在' : '不存在'
        },
        after: {}
      };
      
      // 检查表是否存在
      try {
        await prisma.$queryRaw`SELECT * FROM "Log" LIMIT 1`;
        tableStatus.after.log = '存在';
      } catch (error) {
        // 表不存在，尝试创建
        try {
          await prisma.$executeRaw`
            CREATE TABLE IF NOT EXISTS "Log" (
              "id" TEXT NOT NULL,
              "timestamp" TEXT NOT NULL DEFAULT NOW(),
              "action" TEXT NOT NULL,
              "details" TEXT,
              "ip" TEXT,
              "userId" TEXT,
              "adminId" TEXT,
              
              CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
            )
          `;
          tableStatus.after.log = '已创建';
        } catch (createError) {
          tableStatus.after.log = '创建失败: ' + (createError instanceof Error ? createError.message : String(createError));
        }
      }
      
      // 测试是否可以添加日志
      let testLogId = null;
      try {
        const testLog = await prisma.log.create({
          data: {
            action: 'DB_PUSH_TEST',
            details: 'API路由执行数据库同步测试',
            ip: request.headers.get('x-forwarded-for') || 'unknown'
          }
        });
        testLogId = testLog.id;
      } catch (logError) {
        console.error('测试日志创建失败:', logError);
      }
      
      return new NextResponse(
        JSON.stringify({ 
          success: true, 
          message: '数据库同步操作已尝试执行',
          environment,
          tableStatus,
          testLogId
        }),
        { headers }
      );
    } catch (dbError) {
      console.error('数据库同步失败:', dbError);
      return new NextResponse(
        JSON.stringify({ 
          success: false, 
          message: '数据库同步失败',
          environment,
          error: {
            name: dbError instanceof Error ? dbError.name : 'UnknownError',
            message: dbError instanceof Error ? dbError.message : String(dbError)
          }
        }),
        { status: 500, headers }
      );
    }
  } catch (error) {
    console.error('API错误:', error);
    
    const errorDetails = error instanceof Error 
      ? { 
          name: error.name,
          message: error.message
        }
      : String(error);

    const headers = new Headers();
    headers.set('Content-Type', 'application/json; charset=utf-8');
    
    return new NextResponse(
      JSON.stringify({ 
        success: false, 
        message: '数据库同步API执行失败',
        error: errorDetails
      }),
      { status: 500, headers }
    );
  }
} 