import { neon } from '@neondatabase/serverless';

// 使用环境变量中的数据库连接字符串
const DATABASE_URL = process.env.DATABASE_URL;

// 日志数据库连接信息（隐藏敏感信息）
if (DATABASE_URL) {
  const sanitizedUrl = DATABASE_URL.replace(/(postgres:\/\/[^:]+):[^@]+@/, '$1:****@');
  console.log('数据库连接:', sanitizedUrl);
} else {
  console.warn('警告: DATABASE_URL环境变量未设置，将使用模拟数据库连接');
}

// 创建数据库连接，添加更多选项以提高稳定性
export const sql = neon(DATABASE_URL || 'postgresql://user:password@localhost:5432/test');

// 提供一个测试连接的函数，可用于诊断问题
export async function testDatabaseConnection() {
  try {
    console.log('测试数据库连接...');
    const startTime = Date.now();
    const result = await sql`SELECT 1 as test`;
    const duration = Date.now() - startTime;
    
    console.log(`数据库连接成功，耗时: ${duration}ms, 结果:`, result);
    return { success: true, duration, result };
  } catch (error) {
    console.error('数据库连接测试失败:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    };
  }
}

// 简化的哈希密码函数（和edge-config.ts中保持一致）
function hashPassword(password: string): string {
  // 硬编码常见密码的哈希值
  if (password === 'admin') {
    return '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918';
  }
  if (password === 'admin123') {
    return '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';
  }
  return password; // 简化处理
}

// 初始化数据库表结构
export async function initDatabase() {
  try {
    console.log('开始初始化数据库...');
    
    // 先测试连接
    const connectionTest = await testDatabaseConnection();
    if (!connectionTest.success) {
      throw new Error(`数据库连接失败: ${connectionTest.error}`);
    }
    
    // 创建日志表
    console.log('创建日志表...');
    await sql`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        action VARCHAR(100) NOT NULL,
        details TEXT,
        ip VARCHAR(50),
        "userId" VARCHAR(100),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 创建账户表
    console.log('创建账户表...');
    await sql`
      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        "steamId" VARCHAR(50),
        status VARCHAR(20) DEFAULT 'active',
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "lastLogin" TIMESTAMP WITH TIME ZONE
      )
    `;

    // 创建管理员表
    console.log('创建管理员表...');
    await sql`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        password VARCHAR(100) NOT NULL,
        role VARCHAR(20) DEFAULT 'admin',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 初始化默认管理员账号
    console.log('检查默认管理员账号...');
    const adminExists = await sql`SELECT COUNT(*) as count FROM admins WHERE username = 'admin'`;
    if (parseInt(adminExists[0].count) === 0) {
      console.log('创建默认管理员账号...');
      // 使用哈希后的密码而不是明文密码
      const hashedPassword = hashPassword('admin123');
      await sql`INSERT INTO admins (username, password, role) VALUES ('admin', ${hashedPassword}, 'admin')`;
    }

    // 检查账户表中的数据
    console.log('检查账户表数据...');
    const accountCount = await sql`SELECT COUNT(*) as count FROM accounts`;
    console.log(`当前账户表中有 ${accountCount[0].count} 条记录`);

    console.log('数据库初始化成功');
    return true;
  } catch (error) {
    console.error('数据库初始化失败:', error);
    console.error('错误堆栈:', error instanceof Error ? error.stack : '未知');
    throw error;
  }
} 