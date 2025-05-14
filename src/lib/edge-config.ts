import { createClient } from '@vercel/edge-config';
import { createHash } from 'crypto';

// 直接使用any类型规避EdgeConfigClient类型问题
const edgeConfig = createClient(process.env.EDGE_CONFIG || '') as any;

// 管理员相关操作
export type Admin = {
  id: string;
  username: string;
  password: string; // 实际环境中应该加密存储
  role: 'admin' | 'moderator';
  createdAt: string;
};

// 日志相关操作
export type Log = {
  id: string;
  userId?: string;
  action: string;
  details: string;
  ip?: string;
  timestamp: string;
};

// 账户相关操作
export type Account = {
  id: string;
  username: string;
  phone: string;
  steamId?: string;
  status: 'active' | 'suspended' | 'banned';
  createdAt: string;
  lastLogin?: string;
};

// 会话相关操作
export type Session = {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  userAgent?: string;
  ip?: string;
};

// 密码哈希函数
export function hashPassword(password: string): string {
  return createHash('sha256')
    .update(password + (process.env.PASSWORD_SALT || 'csgo-stats-tracker-salt'))
    .digest('hex');
}

// 初始化数据
export async function initializeData() {
  try {
    // 检查是否已有管理员
    const admins = await getAdmins();
    
    // 如果没有管理员，创建默认管理员
    if (!admins || admins.length === 0) {
      const defaultAdmin: Admin = {
        id: crypto.randomUUID(),
        username: 'admin',
        password: hashPassword('admin123'), // 使用哈希存储密码
        role: 'admin',
        createdAt: new Date().toISOString()
      };
      
      // 创建默认管理员
      await edgeConfig.set('admins', [defaultAdmin]);
      console.log('已创建默认管理员账户');
    }
    
    // 初始化日志和账户集合(如果不存在)
    const logs = await edgeConfig.get('logs');
    if (!logs) {
      await edgeConfig.set('logs', []);
    }
    
    const accounts = await edgeConfig.get('accounts');
    if (!accounts) {
      await edgeConfig.set('accounts', []);
    }
    
    // 初始化会话集合
    const sessions = await edgeConfig.get('sessions');
    if (!sessions) {
      await edgeConfig.set('sessions', []);
    }
    
    return true;
  } catch (error) {
    console.error('初始化Edge Config数据失败:', error);
    return false;
  }
}

// 获取所有管理员
export async function getAdmins(): Promise<Admin[]> {
  try {
    const admins = await edgeConfig.get('admins') as Admin[];
    return Array.isArray(admins) ? admins : [];
  } catch (error) {
    console.error('获取管理员列表失败:', error);
    return [];
  }
}

// 管理员验证
export async function verifyAdmin(username: string, password: string): Promise<Admin | null> {
  try {
    const admins = await getAdmins();
    // 使用哈希验证密码
    const hashedPassword = hashPassword(password);
    const admin = admins.find(a => a.username === username && a.password === hashedPassword);
    return admin || null;
  } catch (error) {
    console.error('验证管理员失败:', error);
    return null;
  }
}

// 添加日志
export async function addLog(log: Omit<Log, 'id' | 'timestamp'>): Promise<Log> {
  try {
    const logs = await edgeConfig.get('logs') as Log[] || [];
    
    // 创建新日志
    const newLog: Log = {
      id: crypto.randomUUID(),
      ...log,
      timestamp: new Date().toISOString()
    };
    
    // 限制日志数量，避免超出存储限制
    if (logs.length >= 100) {
      logs.pop(); // 移除最旧的日志
    }
    
    // 添加到数组开头
    logs.unshift(newLog);
    
    // 更新日志集合
    await edgeConfig.set('logs', logs);
    
    return newLog;
  } catch (error) {
    console.error('添加日志失败:', error);
    // 返回模拟数据以避免应用崩溃
    return {
      id: `error_${Date.now()}`,
      ...log,
      timestamp: new Date().toISOString()
    };
  }
}

// 获取日志
export async function getLogs(): Promise<Log[]> {
  try {
    const logs = await edgeConfig.get('logs') as Log[];
    return Array.isArray(logs) ? logs : [];
  } catch (error) {
    console.error('获取日志失败:', error);
    return [];
  }
}

// 账户相关操作
export async function getAccounts(): Promise<Account[]> {
  try {
    const accounts = await edgeConfig.get('accounts') as Account[];
    return Array.isArray(accounts) ? accounts : [];
  } catch (error) {
    console.error('获取账户失败:', error);
    return [];
  }
}

export async function addAccount(account: Omit<Account, 'id' | 'createdAt'>): Promise<Account | null> {
  try {
    const accounts = await getAccounts();
    
    // 检查用户名和手机号是否已存在
    if (accounts.some(a => a.username === account.username)) {
      throw new Error('用户名已存在');
    }
    
    if (accounts.some(a => a.phone === account.phone)) {
      throw new Error('手机号已存在');
    }
    
    const newAccount: Account = {
      id: crypto.randomUUID(),
      ...account,
      createdAt: new Date().toISOString()
    };
    
    accounts.push(newAccount);
    await edgeConfig.set('accounts', accounts);
    
    return newAccount;
  } catch (error) {
    console.error('添加账户失败:', error);
    return null;
  }
}

export async function updateAccount(id: string, data: Partial<Account>): Promise<Account | null> {
  try {
    const accounts = await getAccounts();
    const index = accounts.findIndex(a => a.id === id);
    
    if (index === -1) {
      return null;
    }
    
    // 更新账户
    accounts[index] = {
      ...accounts[index],
      ...data
    };
    
    await edgeConfig.set('accounts', accounts);
    return accounts[index];
  } catch (error) {
    console.error('更新账户失败:', error);
    return null;
  }
}

export async function deleteAccount(id: string): Promise<boolean> {
  try {
    const accounts = await getAccounts();
    const filteredAccounts = accounts.filter(a => a.id !== id);
    
    if (filteredAccounts.length === accounts.length) {
      return false; // 没有找到账户
    }
    
    await edgeConfig.set('accounts', filteredAccounts);
    return true;
  } catch (error) {
    console.error('删除账户失败:', error);
    return false;
  }
}

// 会话管理
export async function createSession(userId: string, userAgent?: string, ip?: string): Promise<Session> {
  try {
    const sessions = await getSessions();
    
    // 创建新会话
    const session: Session = {
      id: crypto.randomUUID(),
      userId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24小时后过期
      userAgent,
      ip
    };
    
    // 限制每个用户的会话数量
    const userSessions = sessions.filter(s => s.userId === userId);
    if (userSessions.length >= 5) {
      // 删除最旧的会话
      const oldestSession = userSessions.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )[0];
      
      const filteredSessions = sessions.filter(s => s.id !== oldestSession.id);
      filteredSessions.push(session);
      await edgeConfig.set('sessions', filteredSessions);
    } else {
      sessions.push(session);
      await edgeConfig.set('sessions', sessions);
    }
    
    return session;
  } catch (error) {
    console.error('创建会话失败:', error);
    // 返回一个静态会话以避免应用崩溃
    return {
      id: crypto.randomUUID(),
      userId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      userAgent,
      ip
    };
  }
}

export async function getSessions(): Promise<Session[]> {
  try {
    const sessions = await edgeConfig.get('sessions') as Session[];
    return Array.isArray(sessions) ? sessions : [];
  } catch (error) {
    console.error('获取会话失败:', error);
    return [];
  }
}

export async function verifySession(sessionId: string): Promise<{valid: boolean, userId?: string}> {
  try {
    const sessions = await getSessions();
    const session = sessions.find(s => s.id === sessionId);
    
    if (!session) {
      return { valid: false };
    }
    
    // 检查会话是否过期
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      // 删除过期会话
      await deleteSession(sessionId);
      return { valid: false };
    }
    
    return { valid: true, userId: session.userId };
  } catch (error) {
    console.error('验证会话失败:', error);
    return { valid: false };
  }
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  try {
    const sessions = await getSessions();
    const filteredSessions = sessions.filter(s => s.id !== sessionId);
    
    if (filteredSessions.length === sessions.length) {
      return false; // 没有找到会话
    }
    
    await edgeConfig.set('sessions', filteredSessions);
    return true;
  } catch (error) {
    console.error('删除会话失败:', error);
    return false;
  }
}

// 测试Edge Config连接
export async function testConnection(): Promise<{
  connected: boolean;
  edgeConfigId?: string;
  message: string;
}> {
  try {
    // 尝试简单的get操作
    await edgeConfig.get('connection_test');
    
    return {
      connected: true,
      edgeConfigId: process.env.EDGE_CONFIG || '未知',
      message: 'Edge Config连接成功'
    };
  } catch (error) {
    console.error('Edge Config连接测试失败:', error);
    return {
      connected: false,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

export default {
  initializeData,
  getAdmins,
  verifyAdmin,
  addLog,
  getLogs,
  getAccounts,
  addAccount,
  updateAccount,
  deleteAccount,
  hashPassword,
  createSession,
  getSessions,
  verifySession,
  deleteSession,
  testConnection
}; 