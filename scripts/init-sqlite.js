const Database = require('better-sqlite3');
const { randomUUID } = require('crypto');
const path = require('path');

// 打开数据库连接
const db = new Database(path.join(__dirname, '../prisma/dev.db'));

console.log('开始初始化SQLite数据库...');

try {
  // 创建表
  db.exec(`
    CREATE TABLE IF NOT EXISTS Admin (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS Account (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      steamId TEXT,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      lastLogin TEXT
    );
    
    CREATE TABLE IF NOT EXISTS Log (
      id TEXT PRIMARY KEY,
      userId TEXT,
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      ip TEXT,
      timestamp TEXT NOT NULL
    );
  `);
  
  console.log('表创建完成');
  
  // 检查是否已有管理员账户
  const adminCount = db.prepare('SELECT COUNT(*) as count FROM Admin').get();
  
  if (adminCount && adminCount.count > 0) {
    console.log('已存在管理员账户，跳过创建');
    const admins = db.prepare('SELECT * FROM Admin').all();
    console.log('现有管理员:', admins);
  } else {
    // 创建管理员账户
    const adminId = randomUUID();
    const now = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO Admin (id, username, password, role, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(adminId, 'admin', 'admin123', 'admin', now);
    
    console.log('管理员账户创建成功:', {
      id: adminId,
      username: 'admin',
      password: '***',
      role: 'admin',
      createdAt: now
    });
  }
  
  // 添加日志记录
  const logId = randomUUID();
  const now = new Date().toISOString();
  
  db.prepare(`
    INSERT INTO Log (id, action, details, ip, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(logId, 'DB_INIT', 'SQLite数据库初始化', 'local', now);
  
  console.log('日志添加成功:', {
    id: logId,
    action: 'DB_INIT',
    details: 'SQLite数据库初始化',
    timestamp: now
  });
  
  // 显示所有表
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('数据库中的表:', tables.map(t => t.name));
  
  console.log('SQLite数据库初始化完成!');
} catch (error) {
  console.error('初始化错误:', error);
} finally {
  // 关闭数据库连接
  db.close();
} 