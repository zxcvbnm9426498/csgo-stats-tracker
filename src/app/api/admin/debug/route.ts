import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // 检查管理员表数据
    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        username: true,
        password: true,
        role: true,
        createdAt: true
      }
    });
    
    // 为安全起见，在生产环境中屏蔽密码
    const sanitizedAdmins = admins.map(admin => ({
      ...admin,
      password: admin.password.substring(0, 3) + '***' + (admin.password.length > 6 ? admin.password.slice(-3) : '')
    }));

    // 尝试查找指定管理员
    const adminCheck = await prisma.admin.findFirst({
      where: {
        username: 'admin',
      },
    });

    const adminExists = !!adminCheck;
    
    // 测试直接验证
    const directVerify = await prisma.admin.findFirst({
      where: {
        username: 'admin',
        password: 'admin123'
      }
    });

    const directVerifyExists = !!directVerify;

    return NextResponse.json({
      success: true,
      message: '诊断信息',
      diagnostics: {
        adminCount: admins.length,
        adminList: sanitizedAdmins,
        adminExists,
        directVerifyExists
      }
    });
  } catch (error) {
    console.error('调试API错误:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '服务器内部错误', 
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 