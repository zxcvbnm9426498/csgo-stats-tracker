import { PrismaClient } from '@prisma/client';

// 创建一个实现PrismaClient基本接口的MockPrismaClient
class MockPrismaClient {
  // 模拟数据存储
  private data = {
    admin: [
      {
        id: 'mock-admin-id',
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        createdAt: new Date()
      }
    ],
    account: [],
    log: []
  };

  // Admin模型操作
  admin = {
    count: async () => this.data.admin.length,
    findMany: async () => this.data.admin,
    findFirst: async (args: any) => {
      const { where } = args || {};
      if (!where) return this.data.admin[0] || null;
      
      return this.data.admin.find(admin => 
        (!where.username || admin.username === where.username) && 
        (!where.password || admin.password === where.password)
      ) || null;
    },
    create: async (args: any) => {
      const { data } = args;
      const newAdmin = {
        id: `mock-admin-${Date.now()}`,
        username: data.username,
        password: data.password,
        role: data.role || 'admin',
        createdAt: new Date()
      };
      this.data.admin.push(newAdmin);
      return newAdmin;
    }
  };
  
  // Account模型操作
  account = {
    count: async () => this.data.account.length,
    findMany: async () => this.data.account,
    create: async (args: any) => {
      const { data } = args;
      const newAccount = {
        id: `mock-account-${Date.now()}`,
        username: data.username,
        phone: data.phone,
        steamId: data.steamId || null,
        status: data.status || 'active',
        createdAt: new Date(),
        lastLogin: data.lastLogin || null
      };
      this.data.account.push(newAccount);
      return newAccount;
    },
    update: async (args: any) => {
      const { where, data } = args;
      const index = this.data.account.findIndex(acc => acc.id === where.id);
      if (index === -1) throw new Error('Account not found');
      
      const updatedAccount = {
        ...this.data.account[index],
        ...data
      };
      this.data.account[index] = updatedAccount;
      return updatedAccount;
    },
    delete: async (args: any) => {
      const { where } = args;
      const index = this.data.account.findIndex(acc => acc.id === where.id);
      if (index === -1) throw new Error('Account not found');
      
      const deleted = this.data.account.splice(index, 1)[0];
      return deleted;
    }
  };
  
  // Log模型操作
  log = {
    count: async () => this.data.log.length,
    findMany: async (args: any) => {
      if (args && args.orderBy && args.orderBy.timestamp === 'desc') {
        return [...this.data.log].sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      }
      return this.data.log;
    },
    create: async (args: any) => {
      const { data } = args;
      const newLog = {
        id: `mock-log-${Date.now()}`,
        userId: data.userId || null,
        action: data.action,
        details: data.details,
        ip: data.ip || null,
        timestamp: new Date()
      };
      this.data.log.push(newLog);
      return newLog;
    }
  };
}

// 选择合适的Prisma客户端实现
let prismaClient: PrismaClient | MockPrismaClient;

// 判断环境
if (process.env.NODE_ENV === 'production') {
  try {
    // 尝试初始化真实的Prisma客户端
    prismaClient = new PrismaClient();
    console.log('使用真实的Prisma客户端');
  } catch (error) {
    // 如果失败，使用模拟客户端
    console.warn('Prisma客户端初始化失败，使用模拟客户端:', error);
    prismaClient = new MockPrismaClient() as unknown as PrismaClient;
  }
} else {
  // 开发环境 - 使用全局实例避免热重载创建多个连接
  const globalWithPrisma = global as typeof globalThis & {
    prisma: PrismaClient | MockPrismaClient;
  };
  
  if (!globalWithPrisma.prisma) {
    try {
      globalWithPrisma.prisma = new PrismaClient();
    } catch (error) {
      console.warn('开发环境中Prisma初始化失败，使用模拟客户端:', error);
      globalWithPrisma.prisma = new MockPrismaClient() as unknown as PrismaClient;
    }
  }
  
  prismaClient = globalWithPrisma.prisma;
}

export default prismaClient; 