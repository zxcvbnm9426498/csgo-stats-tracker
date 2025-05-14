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
      DATABASE_URL_SET: process.env.DATABASE_URL ? '已设置' : '未设置',
      POSTGRES_URL_SET: process.env.POSTGRES_URL ? '已设置' : '未设置'
    };

    // 初始化数据库
    try {
      // 直接尝试查询操作，不使用$queryRaw
      // 检查管理员账户是否存在
      const adminCount = await prisma.admin.count();
      
      let adminCreated = false;
      // 创建默认管理员账户
      if (adminCount === 0) {
        await prisma.admin.create({
          data: {
            username: 'admin',
            password: 'admin123',
            role: 'admin'
          }
        });
        adminCreated = true;
      }
      
      // 检查测试账户是否存在
      const testAccountExists = await prisma.account.findFirst({
        where: { username: 'test_user' }
      });
      
      let accountCreated = false;
      // 创建测试账户
      if (!testAccountExists) {
        await prisma.account.create({
          data: {
            username: 'test_user',
            phone: '13800138000',
            steamId: '76561198000000000',
            status: 'active'
          }
        });
        accountCreated = true;
      }
      
      // 创建初始化日志
      const log = await prisma.log.create({
        data: {
          action: 'SYSTEM_INIT',
          details: '系统初始化通过API',
          ip: request.headers.get('x-forwarded-for') || 'unknown'
        }
      });
      
      return new NextResponse(
        JSON.stringify({ 
          success: true, 
          message: '数据库初始化成功',
          environment,
          results: {
            adminCreated,
            accountCreated,
            logCreated: true,
            logId: log.id
          }
        }),
        { headers }
      );
    } catch (dbError) {
      console.error('数据库初始化失败:', dbError);
      return new NextResponse(
        JSON.stringify({ 
          success: false, 
          message: '数据库初始化失败',
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
    
    // 获取错误详情但不泄露敏感信息
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
        message: '数据库初始化失败',
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          VERCEL_ENV: process.env.VERCEL_ENV || '未设置',
          DATABASE_URL_SET: process.env.DATABASE_URL ? '已设置' : '未设置',
          POSTGRES_URL_SET: process.env.POSTGRES_URL ? '已设置' : '未设置'
        },
        error: errorDetails
      }),
      { status: 500, headers }
    );
  }
} 