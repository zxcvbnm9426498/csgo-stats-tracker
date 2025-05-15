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
    console.log('开始获取账号列表...');
    
    // 检查数据库连接
    const testQuery = await sql`SELECT 1 as test`;
    console.log('数据库连接测试:', testQuery);
    
    // 获取账号总数
    const countResult = await sql`SELECT COUNT(*) as count FROM accounts`;
    console.log('账号总数:', countResult[0]?.count);
    
    // 获取账号列表
    const result = await sql`SELECT * FROM accounts ORDER BY "createdAt" DESC`;
    console.log('查询结果行数:', result.length);
    
    if (result.length === 0) {
      console.log('没有找到账号记录');
      return [];
    }
    
    // 记录第一行数据结构以便调试
    if (result.length > 0) {
      console.log('第一行数据结构:', Object.keys(result[0]));
      console.log('第一行数据示例:', JSON.stringify(result[0]));
    }
    
    return result.map(row => {
      try {
        return {
          id: row.id?.toString() || '',
          username: row.username || '',
          phone: row.phone || '',
          // 注意列名可能是小写的，PostgreSQL 通常会将列名转为小写除非使用引号
          steamId: (row.steamid || row.steamId || row["steamId"] || null) || undefined,
          status: (row.status || 'active') as 'active' | 'suspended' | 'banned',
          createdAt: row.createdat || row.createdAt || row["createdAt"] 
            ? new Date(row.createdat || row.createdAt || row["createdAt"]).toISOString()
            : new Date().toISOString(),
          lastLogin: (row.lastlogin || row.lastLogin || row["lastLogin"])
            ? new Date(row.lastlogin || row.lastLogin || row["lastLogin"]).toISOString()
            : undefined
        };
      } catch (rowError) {
        console.error('处理账号行数据出错:', rowError, '原始数据:', row);
        // 返回尽可能多的数据，而不是跳过此行
        return {
          id: row.id?.toString() || 'unknown',
          username: row.username || 'unknown',
          phone: row.phone || '',
          status: 'active' as 'active',
          createdAt: new Date().toISOString()
        };
      }
    });
  } catch (error) {
    console.error('获取账号列表失败:', error);
    // 在生产环境中记录更多信息以便调试
    console.error('错误详情:', error instanceof Error ? error.stack : '未知错误');
    return [];
  }
}

// 添加账号
export async function addAccount(accountData: Omit<Account, 'id' | 'createdAt'>): Promise<Account> {
  const { username, phone, steamId, status } = accountData;
  
  try {
    // 明确使用双引号包裹列名，按照PostgreSQL标准
    const result = await sql`
      INSERT INTO accounts (username, phone, "steamId", status, "createdAt")
      VALUES (${username}, ${phone || ''}, ${steamId || null}, ${status || 'active'}, now())
      RETURNING id, username, phone, "steamId" as steamid, status, "createdAt" as createdat
    `;
    
    if (!result || result.length === 0) {
      throw new Error('账号创建失败: 数据库未返回结果');
    }
    
    const row = result[0];
    return {
      id: row.id.toString(),
      username: row.username,
      phone: row.phone,
      steamId: row.steamid || undefined,
      status: row.status as 'active' | 'suspended' | 'banned',
      createdAt: row.createdat ? new Date(row.createdat).toISOString() : new Date().toISOString()
    };
  } catch (error) {
    console.error('添加账号失败:', error);
    throw new Error(`添加账号失败: ${error instanceof Error ? error.message : String(error)}`);
  }
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
    
    // 计算总记录数
    const totalResult = await sql`SELECT COUNT(*)::int as total FROM logs`;
    const total = parseInt(totalResult[0].total);
    const totalPages = Math.ceil(total / limit);
    
    // 简化查询，不使用动态条件，避免类型错误
    let logsResult;
    
    // 基本查询，不使用复杂条件
    if (options?.action) {
      // 如果有action过滤，使用简单查询
      const actionPattern = `%${options.action}%`;
      logsResult = await sql`
        SELECT * FROM logs 
        WHERE action ILIKE ${actionPattern}
        ORDER BY timestamp DESC 
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      // 如果没有过滤条件，使用简单查询
      logsResult = await sql`
        SELECT * FROM logs 
        ORDER BY timestamp DESC 
        LIMIT ${limit} OFFSET ${offset}
      `;
    }
    
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