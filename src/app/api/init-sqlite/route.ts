import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  try {
    const basePath = process.cwd();
    const response = {
      success: false,
      steps: [] as Array<{step: string, status: string, details?: any}>,
    };

    // 1. 检查 prisma 目录是否存在
    response.steps.push({step: '检查文件系统权限', status: '进行中'});
    try {
      const testDir = path.join(basePath, 'test_write_dir');
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }
      fs.writeFileSync(path.join(testDir, 'test.txt'), 'test write permissions');
      fs.unlinkSync(path.join(testDir, 'test.txt'));
      fs.rmdirSync(testDir);
      
      response.steps[0].status = '成功';
      response.steps[0].details = '文件系统权限正常';
    } catch (fsError) {
      response.steps[0].status = '失败';
      response.steps[0].details = {
        error: fsError instanceof Error ? fsError.message : String(fsError)
      };
      // 如果没有文件系统权限，后续步骤都无法执行
      return NextResponse.json(response, { status: 500 });
    }

    // 2. 运行 Prisma 数据库推送命令
    response.steps.push({step: '生成SQLite数据库', status: '进行中'});
    try {
      const prismaSchema = path.join(basePath, 'prisma', 'schema.prisma');
      const dbPath = path.join(basePath, 'prisma', 'dev.db');
      
      // 检查数据库文件是否已存在
      if (fs.existsSync(dbPath)) {
        response.steps[1].status = '跳过';
        response.steps[1].details = 'SQLite数据库文件已存在';
      } else {
        // 使用 Prisma CLI 生成数据库
        await execAsync('npx prisma db push --schema=./prisma/schema.prisma');
        
        if (fs.existsSync(dbPath)) {
          response.steps[1].status = '成功';
          response.steps[1].details = 'SQLite数据库创建成功';
        } else {
          throw new Error('数据库文件未创建');
        }
      }
    } catch (dbError) {
      response.steps[1].status = '失败';
      response.steps[1].details = {
        error: dbError instanceof Error ? dbError.message : String(dbError),
        note: '尝试使用内置SQLite方式创建数据库'
      };
      
      // 尝试直接使用SQLite创建数据库
      try {
        const Database = require('better-sqlite3');
        const dbPath = path.join(basePath, 'prisma', 'dev.db');
        const db = new Database(dbPath);
        
        // 创建Admin表
        db.exec(`
          CREATE TABLE IF NOT EXISTS Admin (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            createdAt TEXT NOT NULL
          )
        `);
        
        // 创建Account表
        db.exec(`
          CREATE TABLE IF NOT EXISTS Account (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            phone TEXT UNIQUE NOT NULL,
            steamId TEXT,
            status TEXT NOT NULL,
            createdAt TEXT NOT NULL,
            lastLogin TEXT
          )
        `);
        
        // 创建Log表
        db.exec(`
          CREATE TABLE IF NOT EXISTS Log (
            id TEXT PRIMARY KEY,
            userId TEXT,
            action TEXT NOT NULL,
            details TEXT NOT NULL,
            ip TEXT,
            timestamp TEXT NOT NULL
          )
        `);
        
        db.close();
        
        response.steps[1].status = '成功';
        response.steps[1].details = '使用内置SQLite创建数据库成功';
      } catch (sqliteError) {
        response.steps[1].status = '失败';
        response.steps[1].details = {
          prismaError: dbError instanceof Error ? dbError.message : String(dbError),
          sqliteError: sqliteError instanceof Error ? sqliteError.message : String(sqliteError)
        };
        return NextResponse.json(response, { status: 500 });
      }
    }

    // 3. 初始化管理员账户
    response.steps.push({step: '初始化管理员账户', status: '进行中'});
    try {
      // 直接使用SQLite初始化管理员
      const Database = require('better-sqlite3');
      const dbPath = path.join(basePath, 'prisma', 'dev.db');
      const db = new Database(dbPath);
      
      // 检查是否已有管理员账户
      const adminCount = db.prepare('SELECT COUNT(*) as count FROM Admin').get();
      
      if (adminCount && adminCount.count > 0) {
        response.steps[2].status = '跳过';
        response.steps[2].details = '管理员账户已存在';
      } else {
        // 创建管理员账户
        const uuid = crypto.randomUUID();
        const now = new Date().toISOString();
        
        db.prepare(`
          INSERT INTO Admin (id, username, password, role, createdAt)
          VALUES (?, ?, ?, ?, ?)
        `).run(uuid, 'admin', 'admin123', 'admin', now);
        
        response.steps[2].status = '成功';
        response.steps[2].details = {
          id: uuid,
          username: 'admin',
          password: '***',
          role: 'admin'
        };
      }
      
      // 添加日志记录
      const logUuid = crypto.randomUUID();
      const now = new Date().toISOString();
      
      db.prepare(`
        INSERT INTO Log (id, action, details, ip, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        logUuid, 
        'DB_INIT', 
        'SQLite数据库初始化', 
        request.headers.get('x-forwarded-for') || 'unknown',
        now
      );
      
      db.close();
      
      // 验证账户是否可用
      const prisma = new PrismaClient();
      const admin = await prisma.admin.findFirst({
        where: { username: 'admin', password: 'admin123' }
      });
      
      if (admin) {
        response.steps.push({
          step: '验证管理员账户',
          status: '成功',
          details: {
            id: admin.id,
            username: admin.username,
            role: admin.role
          }
        });
      } else {
        response.steps.push({
          step: '验证管理员账户',
          status: '警告',
          details: 'Prisma未能验证账户，但SQLite直接操作成功'
        });
      }
      
      await prisma.$disconnect();
    } catch (adminError) {
      response.steps[2].status = '失败';
      response.steps[2].details = {
        error: adminError instanceof Error ? adminError.message : String(adminError)
      };
    }

    response.success = true;
    return NextResponse.json(response);
  } catch (error) {
    console.error('SQLite初始化错误:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'SQLite初始化失败',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 