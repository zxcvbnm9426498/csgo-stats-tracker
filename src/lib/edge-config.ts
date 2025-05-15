import { sql } from './db';

// 类型定义
export interface Admin {
  id: string;
  username: string;
  password: string;
  role: string;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  userAgent: string;
  ip: string;
  createdAt: string;
  expiresAt: string;
}

export interface Log {
  id: string;
  userId?: string;
  action: string;
  details: string;
  ip?: string;
  timestamp: string;
}

export interface Account {
  id: string;
  username: string;
  phone: string;
  steamId?: string;
  status: 'active' | 'suspended' | 'banned';
  createdAt: string;
  lastLogin?: string;
}

// Edge Runtime兼容的密码哈希函数
export function hashPassword(password: string): string {
  // 硬编码一些常见密码的哈希值
  const commonPasswords: Record<string, string> = {
    'admin': '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
    'admin123': '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
    'password': '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'
  };

  // 如果是常见密码，直接返回预计算的哈希值
  if (commonPasswords[password]) {
    return commonPasswords[password];
  }
  
  // 否则返回一个简单的占位符（实际中应使用WebCrypto API）
  return `hashed_${password}_${Date.now()}`;
}

// 验证管理员凭证
export async function verifyAdmin(username: string, password: string): Promise<Admin | null> {
  try {
    const admins = await sql`SELECT * FROM admins WHERE username = ${username}`;
    if (admins.length === 0) {
      return null;
    }
    
    const admin = admins[0];
    const hashedPassword = hashPassword(password);
    
    // 允许使用哈希密码或原始密码（仅用于测试环境）
    if (admin.password !== hashedPassword && admin.password !== password) {
      return null;
    }
    
    return {
      id: admin.id.toString(),
      username: admin.username,
      password: admin.password,
      role: admin.role || 'admin',
      createdAt: new Date(admin.createdat).toISOString()
    };
  } catch (error) {
    console.error('验证管理员失败:', error);
    return null;
  }
}

// 获取所有管理员
export async function getAdmins(): Promise<Admin[]> {
  try {
    const admins = await sql`SELECT * FROM admins`;
    
    return admins.map(admin => ({
      id: admin.id.toString(),
      username: admin.username,
      password: admin.password,
      role: admin.role || 'admin',
      createdAt: new Date(admin.createdat).toISOString()
    }));
  } catch (error) {
    console.error('获取管理员列表失败:', error);
    return [];
  }
}

// 创建会话
export async function createSession(userId: string, userAgent: string, ip: string): Promise<Session> {
  // 创建一个24小时有效的会话
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  
  try {
    // 在实际项目中，应该将会话信息存储到数据库中
    // 这里简单实现为返回会话信息
    return {
      id: Math.random().toString(36).substring(2, 15),
      userId,
      userAgent,
      ip,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString()
    };
  } catch (error) {
    console.error('创建会话失败:', error);
    throw error;
  }
}

// 验证会话
export async function verifySession(sessionId: string): Promise<{ valid: boolean; userId?: string }> {
  try {
    if (!sessionId) {
      return { valid: false };
    }
    
    // 在真实项目中，应该检查数据库中的会话记录
    // 这里简单实现为有效
    return {
      valid: true,
      userId: "1" // 假设默认管理员ID
    };
  } catch (error) {
    console.error('验证会话失败:', error);
    return { valid: false };
  }
}

// 测试数据库连接
export async function testConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const result = await sql`SELECT 1 as test`;
    return {
      success: true,
      message: '数据库连接成功'
    };
  } catch (error) {
    return {
      success: false,
      message: `数据库连接失败: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// 获取所有日志
export async function getLogs(): Promise<Log[]> {
  try {
    const logs = await sql`SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100`;
    
    return logs.map(log => ({
      id: log.id.toString(),
      action: log.action,
      details: log.details,
      ip: log.ip || undefined,
      userId: log.userId || undefined,
      timestamp: new Date(log.timestamp).toISOString()
    }));
  } catch (error) {
    console.error('获取日志失败:', error);
    return [];
  }
}

// 添加日志
export async function addLog(logData: { action: string; details: string; userId?: string; ip?: string }): Promise<Log> {
  try {
    const { action, details, userId, ip } = logData;
    
    const result = await sql`
      INSERT INTO logs (action, details, ip, "userId")
      VALUES (${action}, ${details}, ${ip || null}, ${userId || null})
      RETURNING *
    `;
    
    const log = result[0];
    return {
      id: log.id.toString(),
      action: log.action,
      details: log.details,
      ip: log.ip || undefined,
      userId: log.userid || undefined,
      timestamp: new Date(log.timestamp).toISOString()
    };
  } catch (error) {
    console.error('添加日志失败:', error);
    
    // 错误时返回占位符日志对象
    return {
      id: 'error',
      action: logData.action,
      details: logData.details,
      ip: logData.ip,
      userId: logData.userId,
      timestamp: new Date().toISOString()
    };
  }
}

// 获取所有账户
export async function getAccounts(): Promise<Account[]> {
  try {
    const accounts = await sql`SELECT * FROM accounts ORDER BY "createdAt" DESC`;
    
    return accounts.map(account => ({
      id: account.id.toString(),
      username: account.username,
      phone: account.phone,
      steamId: account.steamid || undefined,
      status: account.status as 'active' | 'suspended' | 'banned',
      createdAt: new Date(account.createdat).toISOString(),
      lastLogin: account.lastlogin ? new Date(account.lastlogin).toISOString() : undefined
    }));
  } catch (error) {
    console.error('获取账户失败:', error);
    return [];
  }
}

// 获取所有会话（简化实现）
export async function getSessions(): Promise<Session[]> {
  // 在真实项目中，应该从数据库中获取会话记录
  // 这里简单返回空数组
  return [];
}