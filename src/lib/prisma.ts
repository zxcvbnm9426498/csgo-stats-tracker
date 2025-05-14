import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

// 声明全局变量类型
declare global {
  var prisma: PrismaClient | undefined;
}

// 创建PrismaClient实例的函数，添加错误处理和SQLite支持
function createPrismaClient() {
  try {
    console.log('创建PrismaClient实例...');
    
    // 确保SQLite数据库文件路径存在
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    console.log('SQLite数据库路径:', dbPath);
    
    // 检查文件是否存在，如果不存在则创建空文件
    try {
      if (!fs.existsSync(dbPath)) {
        console.log('SQLite数据库文件不存在，创建空文件');
        const dirPath = path.dirname(dbPath);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
        fs.writeFileSync(dbPath, '');
      }
    } catch (fsError) {
      console.warn('检查或创建数据库文件时出错:', fsError);
    }
    
    // 创建客户端实例，显式指定数据库URL
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
          findMany: () => Promise.resolve([]),
          count: () => Promise.resolve(0),
          create: (data: any) => Promise.resolve({...data.data, id: 'mock-id', createdAt: new Date()})
        },
        account: {
          findFirst: () => Promise.resolve(null),
          findMany: () => Promise.resolve([]),
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