import { PrismaClient } from '@prisma/client';

// Create a mock PrismaClient for build time
class MockPrismaClient implements Partial<PrismaClient> {
  // Implement the necessary DB models with mock CRUD operations
  admin = {
    count: async () => 1,
    findMany: async () => [],
    findFirst: async () => null,
    create: async (data: any) => ({
      id: 'mock-id',
      username: data.data.username || 'admin',
      password: data.data.password || 'admin123',
      role: data.data.role || 'admin',
      createdAt: new Date()
    })
  };
  
  account = {
    findMany: async () => [],
    create: async (data: any) => ({
      id: 'mock-id',
      username: data.data.username || '',
      phone: data.data.phone || '',
      steamId: data.data.steamId || null,
      status: data.data.status || 'active',
      createdAt: new Date(),
      lastLogin: null
    }),
    update: async (data: any) => ({
      id: data.where.id || 'mock-id',
      username: data.data.username || '',
      phone: data.data.phone || '',
      steamId: data.data.steamId || null,
      status: data.data.status || 'active',
      createdAt: new Date(),
      lastLogin: null
    }),
    delete: async () => ({ id: 'mock-id' })
  };
  
  log = {
    findMany: async () => [],
    create: async (data: any) => ({
      id: 'mock-id',
      userId: data.data.userId || null,
      action: data.data.action || '',
      details: data.data.details || '',
      ip: data.data.ip || null,
      timestamp: new Date()
    })
  };
}

// Choose appropriate client based on environment
let client: PrismaClient | MockPrismaClient;

if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
  // Server-side in production - use mock during build
  client = new MockPrismaClient() as PrismaClient;
} else {
  // Only instantiate PrismaClient if we're not in production build
  // Ensure hot-reloading doesn't create multiple instances in development
  const globalWithPrisma = global as typeof globalThis & {
    prisma: PrismaClient;
  };
  
  if (!globalWithPrisma.prisma) {
    globalWithPrisma.prisma = new PrismaClient();
  }
  
  client = globalWithPrisma.prisma;
}

export default client; 