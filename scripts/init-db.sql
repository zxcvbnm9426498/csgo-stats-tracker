CREATE TABLE IF NOT EXISTS Admin (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Log (
  id TEXT PRIMARY KEY,
  userId TEXT,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  ip TEXT,
  timestamp TEXT NOT NULL
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

INSERT INTO Admin (id, username, password, role, createdAt)
VALUES (
  lower(hex(randomblob(16))),
  'admin',
  'admin123',
  'admin',
  datetime('now')
);

INSERT INTO Log (id, action, details, ip, timestamp)
VALUES (
  lower(hex(randomblob(16))),
  'DB_INIT',
  'SQLite数据库初始化',
  'local',
  datetime('now')
); 