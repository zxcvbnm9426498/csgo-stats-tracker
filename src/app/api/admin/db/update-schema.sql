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