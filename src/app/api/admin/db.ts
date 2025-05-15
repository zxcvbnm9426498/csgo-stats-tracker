import { sql } from '@/lib/db';

// 类型定义
export interface Account {
  id: string;
  username: string;
  userId?: string;
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
    
    const accounts = result.map(row => {
      try {
        return {
          id: row.id?.toString() || '',
          username: row.username || '',
          userId: row.userid || row.userId || row["userId"] || undefined,
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
          userId: row.userid || row.userId || row["userId"] || undefined,
          status: 'active' as 'active',
          createdAt: new Date().toISOString()
        };
      }
    });
    
    // 去除重复的Steam ID (保留最新的)
    const uniqueAccounts: Record<string, Account> = {};
    const steamIdMap: Record<string, boolean> = {};
    
    // 先按创建时间降序排序，确保保留最新的
    accounts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // 去重处理：按ID保留唯一账号，同时确保steamId不重复
    for (const account of accounts) {
      const id = account.id;
      
      // 如果该账号有steamId且之前已经有相同steamId的账号，则跳过
      if (account.steamId && steamIdMap[account.steamId]) {
        console.log(`跳过重复的Steam ID账号: ${account.id}, steamId: ${account.steamId}`);
        continue;
      }
      
      // 保存这个账号
      uniqueAccounts[id] = account;
      
      // 如果有steamId，标记为已存在
      if (account.steamId) {
        steamIdMap[account.steamId] = true;
      }
    }
    
    const uniqueAccountsList = Object.values(uniqueAccounts);
    console.log(`去重后账号数量: ${uniqueAccountsList.length} (原始: ${accounts.length})`);
    
    // 按创建时间降序排序
    return uniqueAccountsList.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('获取账号列表失败:', error);
    // 在生产环境中记录更多信息以便调试
    console.error('错误详情:', error instanceof Error ? error.stack : '未知错误');
    return [];
  }
}

// 通过用户ID获取Steam ID
export async function getSteamIdByUserId(userId: string): Promise<string | null> {
  try {
    console.log(`尝试通过用户ID获取Steam ID: ${userId}`);
    
    // 调用Steam API获取用户信息
    // 这里使用模拟的API调用，实际实现可能需要根据您的业务需求进行调整
    try {
      // 示例：尝试从某个API获取用户的Steam ID
      const response = await fetch(`https://api.example.com/users/${userId}/steam`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.steamId) {
          console.log(`成功获取Steam ID: ${data.steamId}`);
          return data.steamId;
        }
      }
      
      console.log('没有找到对应的Steam ID');
      return null;
    } catch (apiError) {
      console.error('API调用失败:', apiError);
      return null;
    }
  } catch (error) {
    console.error('获取Steam ID失败:', error);
    return null;
  }
}

// 检查账号是否存在
export async function checkAccountExists(criteria: { username?: string; userId?: string; steamId?: string }): Promise<boolean> {
  try {
    const { username, userId, steamId } = criteria;
    
    // 至少需要一个查询条件
    if (!username && !userId && !steamId) {
      return false;
    }
    
    let result;
    
    // 主要检查Steam ID的唯一性
    if (steamId) {
      result = await sql`
        SELECT COUNT(*) as count FROM accounts 
        WHERE "steamId" = ${steamId}
      `;
      
      const steamIdCount = parseInt(result[0].count);
      if (steamIdCount > 0) {
        console.log(`发现重复的Steam ID: ${steamId}`);
        return true;
      }
    }
    
    // 如果还需要检查用户名或用户ID
    if (username || userId) {
      const query = username && userId
        ? sql`SELECT COUNT(*) as count FROM accounts WHERE username = ${username} OR "userId" = ${userId}`
        : username
          ? sql`SELECT COUNT(*) as count FROM accounts WHERE username = ${username}`
          : sql`SELECT COUNT(*) as count FROM accounts WHERE "userId" = ${userId}`;
      
      result = await query;
      const count = parseInt(result[0].count);
      return count > 0;
    }
    
    return false;
  } catch (error) {
    console.error('检查账号是否存在失败:', error);
    // 出错时返回false，避免阻止创建账号
    return false;
  }
}

// 添加账号
export async function addAccount(accountData: Omit<Account, 'id' | 'createdAt'>): Promise<Account> {
  const { username, userId, steamId, status } = accountData;
  
  try {
    // 如果提供了用户ID但没有提供Steam ID，尝试获取Steam ID
    let finalSteamId = steamId;
    if (userId && !steamId) {
      console.log(`尝试通过用户ID获取Steam ID: ${userId}`);
      const foundSteamId = await getSteamIdByUserId(userId);
      if (foundSteamId) {
        console.log(`成功获取到Steam ID: ${foundSteamId}`);
        finalSteamId = foundSteamId;
      }
    }
    
    // 检查账号是否已存在，特别关注Steam ID的唯一性
    if (finalSteamId && await checkAccountExists({ steamId: finalSteamId })) {
      throw new Error('账号已存在: 相同的Steam ID已被使用');
    }
    
    if (await checkAccountExists({ username, userId })) {
      throw new Error('账号已存在: 相同的用户名或用户ID已被使用');
    }
    
    // 明确使用双引号包裹列名，按照PostgreSQL标准
    const result = await sql`
      INSERT INTO accounts (username, "userId", "steamId", status, "createdAt")
      VALUES (${username}, ${userId || null}, ${finalSteamId || null}, ${status || 'active'}, now())
      RETURNING id, username, "userId" as userid, "steamId" as steamid, status, "createdAt" as createdat
    `;
    
    if (!result || result.length === 0) {
      throw new Error('账号创建失败: 数据库未返回结果');
    }
    
    const row = result[0];
    return {
      id: row.id.toString(),
      username: row.username,
      userId: row.userid || undefined,
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
    const { username, userId, steamId, status } = data;
    
    // 检查是否有更新字段
    if (!username && userId === undefined && steamId === undefined && status === undefined) {
      return null;
    }

    // 如果要更新用户名、用户ID或steamId，先检查是否已存在
    if (username || userId !== undefined || steamId !== undefined) {
      // 获取当前账号信息，排除在重复检查中
      const currentAccount = await sql`SELECT * FROM accounts WHERE id = ${id}`;
      
      if (currentAccount.length === 0) {
        console.error('更新账号失败: 找不到ID为', id, '的账号');
        return null;
      }
      
      // 检查更新后的字段是否与其他账号重复
      let hasDuplicate = false;
      let duplicateField = '';
      
      if (username) {
        const usernameCheck = await sql`
          SELECT COUNT(*) as count FROM accounts 
          WHERE username = ${username} AND id != ${id}
        `;
        if (parseInt(usernameCheck[0].count) > 0) {
          hasDuplicate = true;
          duplicateField = '用户名';
        }
      }
      
      if (userId !== undefined && userId !== null) {
        const userIdCheck = await sql`
          SELECT COUNT(*) as count FROM accounts 
          WHERE "userId" = ${userId} AND id != ${id}
        `;
        if (parseInt(userIdCheck[0].count) > 0) {
          hasDuplicate = true;
          duplicateField = duplicateField ? duplicateField + '和用户ID' : '用户ID';
        }
      }
      
      if (steamId !== undefined && steamId !== null) {
        const steamIdCheck = await sql`
          SELECT COUNT(*) as count FROM accounts 
          WHERE "steamId" = ${steamId} AND id != ${id}
        `;
        if (parseInt(steamIdCheck[0].count) > 0) {
          hasDuplicate = true;
          duplicateField = duplicateField ? duplicateField + '和Steam ID' : 'Steam ID';
        }
      }
      
      if (hasDuplicate) {
        throw new Error(`更新失败: ${duplicateField}已被其他账号使用`);
      }
    }

    // 构建动态更新语句，使用多个单独的更新而不是一个复杂的
    let result;
    
    if (username) {
      result = await sql`
        UPDATE accounts SET username = ${username}
        WHERE id = ${id} RETURNING *
      `;
    }
    
    if (userId !== undefined) {
      result = await sql`
        UPDATE accounts SET "userId" = ${userId || null}
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
      userId: row.userid || undefined,
      steamId: row.steamid || undefined,
      status: row.status as 'active' | 'suspended' | 'banned',
      createdAt: new Date(row.createdat).toISOString(),
      lastLogin: row.lastlogin ? new Date(row.lastlogin).toISOString() : undefined
    };
  } catch (error) {
    console.error('更新账号失败:', error);
    throw new Error(`更新账号失败: ${error instanceof Error ? error.message : String(error)}`);
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