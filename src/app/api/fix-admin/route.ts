import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const response = {
      success: false,
      steps: [] as Array<{step: string, status: string, details?: any}>,
      adminCreated: false
    };

    // 1. 检查数据库连接
    response.steps.push({step: '检查数据库连接', status: '进行中'});
    try {
      // 尝试直接连接数据库，不使用Prisma ORM方法
      const db = prisma.$queryRaw ? await prisma.$queryRaw`SELECT 1 as connected` : null;
      const connected = db && Array.isArray(db) && db.length > 0;
      
      if (connected) {
        response.steps[0].status = '成功';
        response.steps[0].details = '数据库连接正常';
      } else {
        response.steps[0].status = '失败';
        response.steps[0].details = '无法直接查询数据库';
        throw new Error('数据库连接测试失败');
      }
    } catch (dbError) {
      response.steps[0].status = '失败';
      response.steps[0].details = {
        error: dbError instanceof Error ? dbError.message : String(dbError)
      };
      
      // 连接失败，尝试获取数据库连接信息
      try {
        response.steps.push({
          step: '获取数据库配置信息',
          status: '进行中'
        });
        
        const dbInfo = {
          databaseUrl: process.env.DATABASE_URL ? '已设置(长度:' + process.env.DATABASE_URL.length + ')' : '未设置',
          postgresUrl: process.env.POSTGRES_URL ? '已设置' : '未设置',
          postgresHost: process.env.PGHOST || process.env.PG_HOST || '未设置',
          nodeEnv: process.env.NODE_ENV,
          vercelEnv: process.env.VERCEL_ENV || '未设置'
        };
        
        response.steps[1].status = '成功';
        response.steps[1].details = dbInfo;
      } catch (configError) {
        response.steps[1].status = '失败';
        response.steps[1].details = {
          error: configError instanceof Error ? configError.message : String(configError)
        };
      }
      
      return NextResponse.json(response, { status: 500 });
    }
    
    // 2. 检查Admin表是否存在
    response.steps.push({step: '检查Admin表', status: '进行中'});
    let adminTableExists = false;
    try {
      await prisma.$queryRaw`SELECT 1 FROM "Admin" LIMIT 1`;
      adminTableExists = true;
      response.steps[1].status = '成功';
      response.steps[1].details = 'Admin表存在';
    } catch (tableError) {
      response.steps[1].status = '失败';
      response.steps[1].details = {
        error: tableError instanceof Error ? tableError.message : String(tableError),
        message: 'Admin表可能不存在'
      };
      
      // 尝试创建Admin表
      response.steps.push({step: '创建Admin表', status: '进行中'});
      try {
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS "Admin" (
            "id" TEXT NOT NULL,
            "username" TEXT NOT NULL UNIQUE,
            "password" TEXT NOT NULL,
            "role" TEXT NOT NULL,
            "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
            
            CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
          )
        `;
        response.steps[2].status = '成功';
        response.steps[2].details = 'Admin表创建成功';
        adminTableExists = true;
      } catch (createError) {
        response.steps[2].status = '失败';
        response.steps[2].details = {
          error: createError instanceof Error ? createError.message : String(createError)
        };
        return NextResponse.json(response, { status: 500 });
      }
    }
    
    // 3. 检查是否已有管理员账户
    if (adminTableExists) {
      response.steps.push({step: '检查管理员账户', status: '进行中'});
      let adminExists = false;
      try {
        const admins = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Admin"`;
        adminExists = Array.isArray(admins) && admins.length > 0 && Number(admins[0].count) > 0;
        
        response.steps[response.steps.length - 1].status = '成功';
        response.steps[response.steps.length - 1].details = {
          adminCount: adminExists ? Number(admins[0].count) : 0,
          message: adminExists ? '已存在管理员账户' : '无管理员账户'
        };
      } catch (countError) {
        response.steps[response.steps.length - 1].status = '失败';
        response.steps[response.steps.length - 1].details = {
          error: countError instanceof Error ? countError.message : String(countError)
        };
      }
      
      // 4. 如果没有管理员账户，创建一个默认账户
      if (!adminExists) {
        response.steps.push({step: '创建默认管理员账户', status: '进行中'});
        try {
          const uuid = crypto.randomUUID();
          await prisma.$executeRaw`
            INSERT INTO "Admin" ("id", "username", "password", "role", "createdAt")
            VALUES (
              ${uuid},
              'admin',
              'admin123',
              'admin',
              datetime('now')
            )
          `;
          
          response.steps[response.steps.length - 1].status = '成功';
          response.steps[response.steps.length - 1].details = {
            id: uuid,
            username: 'admin',
            password: '***', // 不显示实际密码
            role: 'admin'
          };
          response.adminCreated = true;
        } catch (insertError) {
          response.steps[response.steps.length - 1].status = '失败';
          response.steps[response.steps.length - 1].details = {
            error: insertError instanceof Error ? insertError.message : String(insertError)
          };
        }
      }
    }
    
    // 5. 验证创建的管理员账户
    if (response.adminCreated) {
      response.steps.push({step: '验证管理员账户', status: '进行中'});
      try {
        const admin = await prisma.$queryRaw`
          SELECT id, username, role FROM "Admin" 
          WHERE username = 'admin' AND password = 'admin123'
          LIMIT 1
        `;
        
        const verifySuccess = Array.isArray(admin) && admin.length > 0;
        response.steps[response.steps.length - 1].status = verifySuccess ? '成功' : '失败';
        response.steps[response.steps.length - 1].details = verifySuccess 
          ? { id: admin[0].id, username: admin[0].username, role: admin[0].role }
          : { message: '验证失败，无法使用创建的凭据登录' };
      } catch (verifyError) {
        response.steps[response.steps.length - 1].status = '失败';
        response.steps[response.steps.length - 1].details = {
          error: verifyError instanceof Error ? verifyError.message : String(verifyError)
        };
      }
    }
    
    response.success = true;
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('修复API错误:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '修复过程中发生错误',
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 获取请求参数
    const data = await request.json();
    const { forceCreate, adminUsername, adminPassword } = data;
    const username = adminUsername || 'admin';
    const password = adminPassword || 'admin123';
    
    const response = {
      success: false,
      message: '',
      details: null as any
    };
    
    // 直接尝试删除可能存在的管理员账户
    if (forceCreate) {
      try {
        // 先删除原有的同名管理员
        await prisma.$executeRaw`DELETE FROM "Admin" WHERE username = ${username}`;
        
        // 创建新的管理员账户
        const uuid = crypto.randomUUID();
        await prisma.$executeRaw`
          INSERT INTO "Admin" ("id", "username", "password", "role", "createdAt")
          VALUES (
            ${uuid},
            ${username},
            ${password},
            'admin',
            NOW()
          )
        `;
        
        // 验证创建的管理员账户
        const admin = await prisma.$queryRaw`
          SELECT id, username, role FROM "Admin" 
          WHERE username = ${username} AND password = ${password}
          LIMIT 1
        `;
        
        const verifySuccess = Array.isArray(admin) && admin.length > 0;
        if (verifySuccess) {
          response.success = true;
          response.message = '管理员账户创建/更新成功';
          response.details = {
            id: admin[0].id,
            username: admin[0].username,
            role: admin[0].role
          };
        } else {
          response.message = '管理员账户创建/更新失败';
        }
      } catch (error) {
        response.message = '创建管理员账户时出错';
        response.details = {
          error: error instanceof Error ? error.message : String(error)
        };
      }
    } else {
      response.message = '未指定强制创建参数';
    }
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('创建管理员API错误:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '处理请求时出错',
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

// 用于调试数据库连接问题的endpoint
export async function debug() {
  const results = {
    dbConnection: false,
    dbType: process.env.NODE_ENV === 'production' ? 'PostgreSQL' : 'SQLite',
    prismaVersion: '5.x',
    databaseUrl: process.env.DATABASE_URL ? '已设置(长度:'+process.env.DATABASE_URL.length+')' : '未设置',
    error: null as string | null
  };
  
  try {
    await prisma.$queryRaw`SELECT 1 as connected`;
    results.dbConnection = true;
  } catch (error) {
    results.error = error instanceof Error ? error.message : String(error);
  }
  
  return results;
} 