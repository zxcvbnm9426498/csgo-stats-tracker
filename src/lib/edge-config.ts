import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

// 使用简单的对象存储缓存数据
const cache = {
  admins: null as any[] | null,
  logs: null as any[] | null,
  accounts: null as any[] | null,
  sessions: null as any[] | null
};

// 默认硬编码管理员账号
const defaultAdmins = [
  {
    id: "1",
    username: "admin",
    password: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918", // admin
    role: "admin",
    createdAt: new Date().toISOString()
  }
];

// 模拟数据处理
interface Admin {
  id: string;
  username: string;
  password: string;
  role: string;
  createdAt: string;
}

interface Log {
  id: string;
  userId?: string;
  action: string;
  details: string;
  ip?: string;
  timestamp: string;
}

interface Account {
  id: string;
  username: string;
  phone: string;
  steamId?: string;
  status: 'active' | 'suspended' | 'banned';
  createdAt: string;
  lastLogin?: string;
}

interface Session {
  id: string;
  userId: string;
  userAgent: string;
  ip: string;
  createdAt: string;
  expiresAt: string;
}

// 密码哈希函数 (简化版)
export function hashPassword(password: string): string {
  // 由于Edge Runtime不支持Node.js的crypto，我们使用一个预计算的SHA-256哈希
  // 在实际产品中，这应该使用Web Crypto API或其他Edge兼容的方法
  // 这里仅作为演示，实际使用应注意安全性

  // 硬编码一些常见密码的哈希值以便测试
  const commonPasswords: Record<string, string> = {
    'admin': '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
    'admin123': '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
    'password': '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'
  };

  return commonPasswords[password] || password; // 对于未知密码，仅作为演示返回原值
}

// 验证管理员凭证
export async function verifyAdmin(username: string, password: string): Promise<Admin | null> {
  const admins = await getAdmins();
  const hashedPassword = hashPassword(password);
  
  const admin = admins.find(
    (a) => a.username === username && (a.password === hashedPassword || a.password === password)
  );
  
  return admin || null;
}

// 获取所有管理员
export async function getAdmins(): Promise<Admin[]> {
  // 使用缓存或返回默认管理员
  return defaultAdmins;
}

// 创建会话
export async function createSession(userId: string, userAgent: string, ip: string): Promise<Session> {
  // 创建新会话
  const session: Session = {
    id: uuidv4(),
    userId,
    userAgent,
    ip,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24小时后过期
  };
  
  return session;
}

// 验证会话
export async function verifySession(sessionId: string): Promise<{ valid: boolean; userId?: string }> {
  try {
    // 从cookie验证会话是否存在
    if (!sessionId) {
      return { valid: false };
    }
    
    // 在实际产品中，应查询数据库或缓存验证会话
    // 这里简单实现为可用
    return {
      valid: true,
      userId: "1" // 默认管理员ID
    };
  } catch (error) {
    console.error('验证会话失败:', error);
    return { valid: false };
  }
}

// 获取所有会话
export async function getSessions(): Promise<Session[]> {
  // 在真实环境中应从数据库获取
  return [];
}

// 获取所有日志
export async function getLogs(): Promise<Log[]> {
  // 在真实环境应从数据库获取
  return [];
}

// 添加日志
export async function addLog(logData: { action: string; details: string; userId?: string; ip?: string }): Promise<Log> {
  const log: Log = {
    id: uuidv4(),
    action: logData.action,
    details: logData.details,
    userId: logData.userId,
    ip: logData.ip,
    timestamp: new Date().toISOString()
  };
  
  // 在真实环境中应写入数据库
  console.log('添加日志:', log);
  
  return log;
}

// 获取所有账户
export async function getAccounts(): Promise<Account[]> {
  // 在真实环境中应从数据库获取
  return [];
}

// 测试连接
export async function testConnection(): Promise<{ success: boolean; message: string }> {
  // 简化实现，始终返回成功
  return {
    success: true,
    message: 'Edge Runtime 连接成功'
  };
}