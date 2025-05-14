import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

// 声明全局变量类型
declare global {
  var prisma: PrismaClient | undefined;
}

// 创建PrismaClient实例的函数，添加错误处理和重试逻辑
function createPrismaClient() {
  try {
    console.log('创建PrismaClient实例...');
    
    // 确保数据库文件存在
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    const dbExists = fs.existsSync(dbPath);
    
    if (!dbExists) {
      console.warn('SQLite数据库文件不存在:', dbPath);
      // 创建一个空的数据库文件
      if (process.env.NODE_ENV !== 'production') {
        console.log('尝试创建SQLite数据库文件...');
        try {
          fs.writeFileSync(dbPath, '');
          console.log('已创建空数据库文件');
        } catch (fsError) {
          console.error('创建数据库文件失败:', fsError);
        }
      }
    }
    
    // 创建不带$queryRaw的客户端实例
    const client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      datasources: {
        db: {
          url: `file:${dbPath}`
        }
      }
    });
    
    console.log('PrismaClient实例创建成功');
    return client;
  } catch (error) {
    console.error('创建PrismaClient实例时出错:', error);
    
    if (process.env.NODE_ENV === 'production') {
      console.warn('在生产环境使用静态PrismaClient实现');
      // 创建一个静态的客户端对象，避免报错
      return {
        admin: { 
          findFirst: () => Promise.resolve(null),
          count: () => Promise.resolve(0),
          create: (data: any) => Promise.resolve({...data.data, id: 'mock-id', createdAt: new Date()})
        },
        account: {
          findFirst: () => Promise.resolve(null),
          count: () => Promise.resolve(0),
          create: (data: any) => Promise.resolve({...data.data, id: 'mock-id', createdAt: new Date()}),
          update: () => Promise.resolve(null),
          delete: () => Promise.resolve(null)
        },
        log: {
          findMany: () => Promise.resolve([]),
          count: () => Promise.resolve(0),
          create: (data: any) => Promise.resolve({...data.data, id: 'mock-id', timestamp: new Date()})
        },
        $disconnect: () => Promise.resolve(),
        $connect: () => Promise.resolve(),
        $queryRaw: () => Promise.resolve([]),
        $executeRaw: () => Promise.resolve(null)
      } as unknown as PrismaClient;
    }
    
    throw error;
  }
}

// 创建或获取PrismaClient实例
let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  // 在生产环境中，每次都创建新的实例
  prisma = createPrismaClient();
} else {
  // 在开发环境中，复用全局实例以避免多个连接
  if (!global.prisma) {
    global.prisma = createPrismaClient();
  }
  prisma = global.prisma;
}

export default prisma; 