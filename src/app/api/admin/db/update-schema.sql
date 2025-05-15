-- 检查账户表中是否存在authToken和tokenExpiry列
SELECT COUNT(*) AS column_count 
FROM pragma_table_info('accounts') 
WHERE name IN ('authToken', 'tokenExpiry');

-- 如果列不存在，则添加这些列
ALTER TABLE accounts ADD COLUMN "authToken" TEXT;
ALTER TABLE accounts ADD COLUMN "tokenExpiry" TIMESTAMP;

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_accounts_authToken ON accounts("authToken");
CREATE INDEX IF NOT EXISTS idx_accounts_tokenExpiry ON accounts("tokenExpiry");
CREATE INDEX IF NOT EXISTS idx_accounts_steamId ON accounts("steamId");

-- 账号表
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  phone TEXT UNIQUE,
  "userId" TEXT UNIQUE,
  "steamId" TEXT,
  status TEXT DEFAULT 'active',
  "authToken" TEXT,
  "tokenExpiry" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "lastLogin" TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_accounts_authToken ON accounts("authToken");
CREATE INDEX IF NOT EXISTS idx_accounts_tokenExpiry ON accounts("tokenExpiry");
CREATE INDEX IF NOT EXISTS idx_accounts_steamId ON accounts("steamId");

-- 日志表
CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY,
  "userId" TEXT,
  action TEXT NOT NULL,
  details TEXT,
  ip TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API令牌表
CREATE TABLE IF NOT EXISTS api_tokens (
  id TEXT PRIMARY KEY,
  phone TEXT,
  verification_code TEXT,
  token TEXT,
  token_expiry TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used TIMESTAMP,
  source TEXT,
  status TEXT DEFAULT 'active'
);

-- API令牌索引
CREATE INDEX IF NOT EXISTS idx_api_tokens_token ON api_tokens(token);
CREATE INDEX IF NOT EXISTS idx_api_tokens_phone ON api_tokens(phone);

-- 玩家统计数据缓存表
CREATE TABLE IF NOT EXISTS player_stats (
  id SERIAL PRIMARY KEY,
  steam_id TEXT UNIQUE NOT NULL,
  stats JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_player_stats_steam_id ON player_stats(steam_id); 