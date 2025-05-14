import { PrismaClient } from '@prisma/client';

// 为全局变量添加类型声明
declare global {
  var prisma: PrismaClient | undefined;
}

// 简单的PrismaClient初始化，确保开发环境中不会创建多个实例
const prisma = global.prisma || new PrismaClient();

// 只有在非生产环境下才将prisma赋值给全局变量
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma; 