import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // 获取秘钥参数，只有提供正确秘钥才能查看调试信息
    const secretKey = request.nextUrl.searchParams.get('secret');
    if (secretKey !== 'debug123') {
      return NextResponse.json(
        { success: false, message: '未授权访问' },
        { status: 403 }
      );
    }
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      dbConnection: false,
      admin: null as any,
      error: null as string | null
    };
    
    // 测试数据库连接
    try {
      const dbTest = await prisma.$queryRaw`SELECT 1 as connected`;
      debugInfo.dbConnection = Array.isArray(dbTest) && dbTest.length > 0;
    } catch (dbError) {
      debugInfo.error = dbError instanceof Error ? dbError.message : String(dbError);
      return NextResponse.json(debugInfo);
    }
    
    // 查询Admin表
    try {
      const admins = await prisma.$queryRaw`
        SELECT id, username, role, password, "createdAt"
        FROM "Admin"
      `;
      
      // 混淆密码数据但保留部分信息用于调试
      const secureAdmins = Array.isArray(admins) ? admins.map(admin => ({
        id: admin.id,
        username: admin.username,
        role: admin.role,
        passwordLength: admin.password ? admin.password.length : 0,
        passwordFirstChar: admin.password ? admin.password.charAt(0) : '',
        passwordLastChar: admin.password ? admin.password.charAt(admin.password.length - 1) : '',
        createdAt: admin.createdAt
      })) : [];
      
      debugInfo.admin = {
        count: secureAdmins.length,
        records: secureAdmins
      };
    } catch (queryError) {
      debugInfo.error = queryError instanceof Error ? queryError.message : String(queryError);
    }
    
    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error('Admin调试API错误:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '调试过程中发生错误',
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
} 