import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
    let logTableExists = true;
    
    try {
      await prisma.log.findFirst();
    } catch (error) {
      logTableExists = false;
    }

    if (logTableExists) {
      return new NextResponse(
        JSON.stringify({ 
          success: true, 
          message: 'Log表已存在，无需创建',
          environment
        }),
        { headers }
      );
    }

    // 尝试创建Log表
    try {
      // 创建Log表
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "Log" (
          "id" TEXT NOT NULL,
          "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "action" TEXT NOT NULL,
          "details" TEXT,
          "ip" TEXT,
          "userId" TEXT,
          "adminId" TEXT,
          
          CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
        )
      `;
      
      // 测试是否可以添加日志
      let testLogId = null;
      try {
        const testLog = await prisma.log.create({
          data: {
            action: 'CREATE_LOG_TABLE',
            details: '通过API创建Log表',
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
          message: 'Log表创建成功',
          environment,
          testLogId
        }),
        { headers }
      );
    } catch (dbError) {
      console.error('创建Log表失败:', dbError);
      return new NextResponse(
        JSON.stringify({ 
          success: false, 
          message: '创建Log表失败',
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
        message: '创建Log表API执行失败',
        error: errorDetails
      }),
      { status: 500, headers }
    );
  }
} 