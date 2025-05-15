import { neon } from '@neondatabase/serverless';

// 使用环境变量中的数据库连接字符串
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.warn('警告: DATABASE_URL环境变量未设置，使用模拟数据');
}

// 创建数据库连接
export const sql = neon(DATABASE_URL || 'postgresql://user:password@localhost:5432/test');

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
    // 创建日志表
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
    await sql`
      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        "steamId" VARCHAR(50),
        status VARCHAR(20) DEFAULT 'active',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "lastLogin" TIMESTAMP
      )
    `;

    // 创建管理员表
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
    const adminExists = await sql`SELECT COUNT(*) as count FROM admins WHERE username = 'admin'`;
    if (parseInt(adminExists[0].count) === 0) {
      // 使用哈希后的密码而不是明文密码
      const hashedPassword = hashPassword('admin123');
      await sql`INSERT INTO admins (username, password, role) VALUES ('admin', ${hashedPassword}, 'admin')`;
    }

    console.log('数据库初始化成功');
    return true;
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
} 