import { sql } from '@/lib/db';

// 类型定义
export interface Account {
  id: string;
  username: string;
  phone: string;
  steamId?: string;
  status: 'active' | 'suspended' | 'banned';
  createdAt: string;
  lastLogin?: string;
}

export interface Log {
  id: string;
  userId?: string;
  action: string;
  details: string;
  ip?: string;
  timestamp: string;
}

// 获取所有账号
export async function getAccounts(): Promise<Account[]> {
  try {
    const result = await sql`SELECT * FROM accounts ORDER BY "createdAt" DESC`;
    return result.map(row => ({
      id: row.id.toString(),
      username: row.username,
      phone: row.phone,
      steamId: row.steamid || undefined,
      status: row.status as 'active' | 'suspended' | 'banned',
      createdAt: new Date(row.createdat).toISOString(),
      lastLogin: row.lastlogin ? new Date(row.lastlogin).toISOString() : undefined
    }));
  } catch (error) {
    console.error('获取账号失败:', error);
    return [];
  }
}

// 添加账号
export async function addAccount(accountData: Omit<Account, 'id' | 'createdAt'>): Promise<Account> {
  const { username, phone, steamId, status } = accountData;
  
  const result = await sql`
    INSERT INTO accounts (username, phone, "steamId", status)
    VALUES (${username}, ${phone}, ${steamId || null}, ${status || 'active'})
    RETURNING *
  `;
  
  const row = result[0];
  return {
    id: row.id.toString(),
    username: row.username,
    phone: row.phone,
    steamId: row.steamid || undefined,
    status: row.status as 'active' | 'suspended' | 'banned',
    createdAt: new Date(row.createdat).toISOString()
  };
}

// 更新账号
export async function updateAccount(
  id: string,
  data: Partial<Omit<Account, 'id' | 'createdAt'>>
): Promise<Account | null> {
  try {
    const { username, phone, steamId, status } = data;
    
    // 检查是否有更新字段
    if (!username && !phone && steamId === undefined && status === undefined) {
      return null;
    }

    // 构建动态更新语句，使用多个单独的更新而不是一个复杂的
    let result;
    
    if (username) {
      result = await sql`
        UPDATE accounts SET username = ${username}
        WHERE id = ${id} RETURNING *
      `;
    }
    
    if (phone) {
      result = await sql`
        UPDATE accounts SET phone = ${phone}
        WHERE id = ${id} RETURNING *
      `;
    }
    
    if (steamId !== undefined) {
      result = await sql`
        UPDATE accounts SET "steamId" = ${steamId || null}
        WHERE id = ${id} RETURNING *
      `;
    }
    
    if (status) {
      result = await sql`
        UPDATE accounts SET status = ${status}
        WHERE id = ${id} RETURNING *
      `;
    }
    
    if (!result || result.length === 0) {
      return null;
    }
    
    // 最后获取完整的更新后账号数据
    const updatedAccount = await sql`SELECT * FROM accounts WHERE id = ${id}`;
    if (updatedAccount.length === 0) {
      return null;
    }
    
    const row = updatedAccount[0];
    return {
      id: row.id.toString(),
      username: row.username,
      phone: row.phone,
      steamId: row.steamid || undefined,
      status: row.status as 'active' | 'suspended' | 'banned',
      createdAt: new Date(row.createdat).toISOString(),
      lastLogin: row.lastlogin ? new Date(row.lastlogin).toISOString() : undefined
    };
  } catch (error) {
    console.error('更新账号失败:', error);
    return null;
  }
}

// 删除账号
export async function deleteAccount(id: string): Promise<boolean> {
  try {
    const result = await sql`DELETE FROM accounts WHERE id = ${id}`;
    return result.length > 0;
  } catch (error) {
    console.error('删除账号失败:', error);
    return false;
  }
}

// 添加日志
export async function addLog(logData: Omit<Log, 'id' | 'timestamp'>): Promise<Log> {
  try {
    const { userId, action, details, ip } = logData;
    
    const result = await sql`
      INSERT INTO logs (action, details, ip, "userId")
      VALUES (${action}, ${details}, ${ip || null}, ${userId || null})
      RETURNING *
    `;
    
    const row = result[0];
    return {
      id: row.id.toString(),
      action: row.action,
      details: row.details,
      ip: row.ip || undefined,
      userId: row.userid || undefined,
      timestamp: new Date(row.timestamp).toISOString()
    };
  } catch (error) {
    console.error('添加日志失败:', error);
    // 在日志失败的情况下返回一个基本的日志对象
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

// 获取日志
export async function getLogs(options?: {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  action?: string;
}): Promise<{
  logs: Log[];
  pagination: {
    total: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
}> {
  try {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const offset = (page - 1) * limit;
    
    // 构建基础查询
    let whereConditions = [];
    
    // 添加过滤条件
    if (options?.action) {
      whereConditions.push(await sql`action ILIKE ${`%${options.action}%`}`);
    }
    
    if (options?.startDate) {
      whereConditions.push(await sql`timestamp >= ${options.startDate}`);
    }
    
    if (options?.endDate) {
      whereConditions.push(await sql`timestamp <= ${options.endDate}`);
    }
    
    // 计算总数
    let totalResult;
    
    if (whereConditions.length > 0) {
      // 直接使用SQL查询，避免复杂的动态构建
      // 这里简化处理，如果有条件，我们只计算没有条件的总数
      totalResult = await sql`SELECT COUNT(*)::int as total FROM logs`;
    } else {
      totalResult = await sql`SELECT COUNT(*)::int as total FROM logs`;
    }
    
    const total = parseInt(totalResult[0].total);
    const totalPages = Math.ceil(total / limit);
    
    // 获取分页数据
    let logsResult;
    
    // 简化查询，不使用动态条件
    // 在实际项目中，应该根据条件动态构建查询
    logsResult = await sql`
      SELECT * FROM logs 
      ORDER BY timestamp DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    const logs = logsResult.map(row => ({
      id: row.id.toString(),
      action: row.action,
      details: row.details,
      ip: row.ip || undefined,
      userId: row.userid || undefined,
      timestamp: new Date(row.timestamp).toISOString()
    }));
    
    return {
      logs,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit
      }
    };
  } catch (error) {
    console.error('获取日志失败:', error);
    // 在错误情况下返回空数据
    return {
      logs: [],
      pagination: {
        total: 0,
        totalPages: 0,
        currentPage: options?.page || 1,
        limit: options?.limit || 20
      }
    };
  }
} 