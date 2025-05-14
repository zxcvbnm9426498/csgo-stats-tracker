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
      vercelEnv: process.env.VERCEL_ENV || '未设置',
      dbConfig: {
        databaseUrl: process.env.DATABASE_URL ? '已设置(长度:' + process.env.DATABASE_URL.length + ')' : '未设置',
        postgresUrl: process.env.POSTGRES_URL ? '已设置' : '未设置',
        postgresHost: process.env.PGHOST || process.env.PG_HOST || '未设置'
      },
      dbConnection: false,
      prisma: {
        adminExists: 'admin' in prisma,
        logExists: 'log' in prisma,
        accountExists: 'account' in prisma,
        methods: Object.keys(prisma)
      },
      tables: {} as Record<string, any>,
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
    
    // 检查表结构
    try {
      // PostgreSQL特定查询，检查表是否存在
      const tableQuery = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `;
      
      if (Array.isArray(tableQuery)) {
        const tables = tableQuery.map((t: any) => t.table_name);
        debugInfo.tables = {
          all: tables,
          adminExists: tables.includes('Admin'),
          logExists: tables.includes('Log'),
          accountExists: tables.includes('Account')
        };
      }
    } catch (tableError) {
      debugInfo.error = `表结构查询错误: ${tableError instanceof Error ? tableError.message : String(tableError)}`;
    }
    
    // 尝试直接创建Admin账户
    const createAdminParam = request.nextUrl.searchParams.get('create');
    if (createAdminParam === 'true') {
      try {
        // 尝试删除原有的admin用户
        try {
          await prisma.$executeRaw`DELETE FROM "Admin" WHERE username = 'admin'`;
        } catch (deleteError) {
          // 忽略删除错误
        }
        
        // 创建新的admin用户
        const adminId = crypto.randomUUID();
        await prisma.$executeRaw`
          INSERT INTO "Admin" ("id", "username", "password", "role", "createdAt")
          VALUES (
            ${adminId},
            'admin',
            'admin123',
            'admin',
            NOW()
          )
        `;
        
        debugInfo.admin = {
          message: 'Admin用户已创建',
          id: adminId,
          username: 'admin',
          role: 'admin'
        };
      } catch (createError) {
        debugInfo.error = `创建Admin失败: ${createError instanceof Error ? createError.message : String(createError)}`;
      }
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
      
      if (!debugInfo.admin) {
        debugInfo.admin = {
          count: secureAdmins.length,
          records: secureAdmins
        };
      } else {
        debugInfo.admin.count = secureAdmins.length;
        debugInfo.admin.records = secureAdmins;
      }
    } catch (queryError) {
      if (!debugInfo.error) {
        debugInfo.error = queryError instanceof Error ? queryError.message : String(queryError);
      }
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