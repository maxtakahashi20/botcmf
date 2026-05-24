-- users
CREATE TABLE IF NOT EXISTS users (
  discord_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  patente TEXT,
  setor TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- work_sessions
CREATE TABLE IF NOT EXISTS work_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  paused_time_ms INTEGER NOT NULL DEFAULT 0,
  pause_started_at TEXT,
  total_time_ms INTEGER,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'PAUSED', 'FINISHED', 'CANCELED')),
  channel_id TEXT,
  approved INTEGER NOT NULL DEFAULT 0,
  admin_note TEXT,
  FOREIGN KEY (user_id) REFERENCES users(discord_id)
);

-- work_logs
CREATE TABLE IF NOT EXISTS work_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  reason TEXT,
  FOREIGN KEY (session_id) REFERENCES work_sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON work_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON work_sessions(status);
CREATE INDEX IF NOT EXISTS idx_logs_session ON work_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_logs_user ON work_logs(user_id);
