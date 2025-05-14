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

    // 检查Admin表中是否有记录
    const adminCount = await prisma.admin.count();
    
    if (adminCount > 0) {
      // 已有管理员记录
      return new NextResponse(
        JSON.stringify({ 
          success: true, 
          message: 'Admin表中已有记录，无需初始化',
          environment,
          adminCount
        }),
        { headers }
      );
    }

    // 创建默认管理员账户
    try {
      const admin = await prisma.admin.create({
        data: {
          username: 'admin',
          password: 'admin123',
          role: 'admin'
        }
      });
      
      // 创建初始化日志
      let logId = null;
      try {
        const log = await prisma.log.create({
          data: {
            action: 'ADMIN_INIT',
            details: '通过API初始化管理员账号',
            ip: request.headers.get('x-forwarded-for') || 'unknown'
          }
        });
        logId = log.id;
      } catch (logError) {
        console.error('创建日志失败:', logError);
      }
      
      return new NextResponse(
        JSON.stringify({ 
          success: true, 
          message: '管理员账户初始化成功',
          environment,
          adminId: admin.id,
          logId
        }),
        { headers }
      );
    } catch (dbError) {
      console.error('创建管理员账户失败:', dbError);
      return new NextResponse(
        JSON.stringify({ 
          success: false, 
          message: '创建管理员账户失败',
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
        message: '初始化管理员账户API执行失败',
        error: errorDetails
      }),
      { status: 500, headers }
    );
  }
} 