import { sql } from './db';
import crypto from 'crypto';

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

// 密码哈希函数
export function hashPassword(password: string, salt = 'csgo-stats-tracker-salt'): string {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
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
    
    if (admin.password !== hashedPassword) {
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