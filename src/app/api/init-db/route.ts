import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 记录数据库是否已初始化
let isDbInitialized = false;

// 初始化函数
async function initializeDatabase() {
  if (isDbInitialized) {
    return { success: true, message: '数据库已初始化' };
  }
  
  const results = {
    success: false,
    tables: {
      admin: false,
      account: false,
      log: false
    },
    admin: false,
    errors: [] as string[]
  };
  
  try {
    // 创建Admin表
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "Admin" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "username" TEXT NOT NULL UNIQUE,
          "password" TEXT NOT NULL,
          "role" TEXT NOT NULL,
          "createdAt" TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `;
      results.tables.admin = true;
    } catch (error) {
      results.errors.push(`创建Admin表失败: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // 创建Account表
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "Account" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "username" TEXT NOT NULL UNIQUE,
          "phone" TEXT NOT NULL UNIQUE,
          "steamId" TEXT,
          "status" TEXT NOT NULL,
          "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
          "lastLogin" TEXT
        )
      `;
      results.tables.account = true;
    } catch (error) {
      results.errors.push(`创建Account表失败: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // 创建Log表
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "Log" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT,
          "action" TEXT NOT NULL,
          "details" TEXT NOT NULL,
          "ip" TEXT,
          "timestamp" TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `;
      results.tables.log = true;
    } catch (error) {
      results.errors.push(`创建Log表失败: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // 检查Admin表是否已有记录
    let hasAdmin = false;
    try {
      const admins = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Admin"`;
      hasAdmin = Array.isArray(admins) && admins.length > 0 && Number(admins[0].count) > 0;
    } catch (error) {
      results.errors.push(`检查Admin记录失败: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // 如果没有管理员账户，创建一个默认账户
    if (!hasAdmin) {
      try {
        const adminId = crypto.randomUUID();
        await prisma.$executeRaw`
          INSERT INTO "Admin" ("id", "username", "password", "role", "createdAt")
          VALUES (
            ${adminId},
            'admin',
            'admin123',
            'admin',
            datetime('now')
          )
        `;
        results.admin = true;
      } catch (error) {
        results.errors.push(`创建Admin账户失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      results.admin = true;
    }
    
    results.success = results.tables.admin && results.tables.account && results.tables.log && results.admin;
    isDbInitialized = results.success;
    
    return results;
  } catch (error) {
    results.errors.push(`数据库初始化过程中发生错误: ${error instanceof Error ? error.message : String(error)}`);
    return results;
  }
}

// 自动初始化数据库
let initializationPromise: Promise<any> | null = null;

export async function GET(request: NextRequest) {
  try {
    // 如果初始化尚未开始，则开始初始化
    if (!initializationPromise) {
      initializationPromise = initializeDatabase();
    }
    
    // 等待初始化完成
    const results = await initializationPromise;
    
    // 设置响应头确保正确的字符编码
    const headers = new Headers();
    headers.set('Content-Type', 'application/json; charset=utf-8');
    
    return new NextResponse(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        ...results
      }),
      { headers }
    );
  } catch (error) {
    console.error('数据库初始化API错误:', error);
    
    const headers = new Headers();
    headers.set('Content-Type', 'application/json; charset=utf-8');
    
    return new NextResponse(
      JSON.stringify({
        success: false,
        message: '数据库初始化过程中发生错误',
        error: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers }
    );
  }
} 