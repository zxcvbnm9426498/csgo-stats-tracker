import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // 检查Prisma实例
    const prismaInfo = {
      // 检查Prisma对象上的方法和属性
      prismaKeys: Object.keys(prisma),
      adminExists: 'admin' in prisma,
      // @ts-ignore - 忽略类型检查
      adminModelExists: prisma.admin ? true : false,
      // 使用安全访问检查模型方法
      adminFindFirstMethod: typeof prisma?.admin?.findFirst === 'function',
      adminFindManyMethod: typeof prisma?.admin?.findMany === 'function',
      // 尝试安全地获取环境信息
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        DATABASE_URL_SET: process.env.DATABASE_URL ? '已设置' : '未设置'
      }
    };

    // 尝试直接检查表是否存在
    let rawAdminData = [];
    try {
      // @ts-ignore
      if (prisma.$queryRaw) {
        // @ts-ignore - 使用 $queryRaw 来原始查询
        rawAdminData = await prisma.$queryRaw`SELECT * FROM "Admin" LIMIT 1`;
      }
    } catch (queryError) {
      console.error('原始查询错误:', queryError);
    }

    // 尝试一个简单的数据库连接测试
    let dbConnected = false;
    try {
      // @ts-ignore - 尝试最简单的查询
      await prisma.$queryRaw`SELECT 1 as test`;
      dbConnected = true;
    } catch (connError) {
      console.error('数据库连接测试失败:', connError);
    }

    // 返回所有信息
    return NextResponse.json({
      success: true,
      message: '诊断信息',
      prismaInfo,
      rawAdminData: rawAdminData.length > 0 ? '有数据' : '无数据',
      dbConnected,
      prismaClient: {
        // 安全显示类型和部分内容
        type: typeof prisma,
        constructorName: prisma.constructor ? prisma.constructor.name : 'Unknown'
      }
    });
  } catch (error) {
    console.error('调试API错误:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '服务器内部错误', 
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.name : 'Unknown',
        prismaType: typeof prisma,
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 