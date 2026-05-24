CREATE TABLE IF NOT EXISTS users (
  discord_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  patente TEXT,
  setor TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS work_sessions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(discord_id),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  paused_time_ms BIGINT NOT NULL DEFAULT 0,
  pause_started_at TIMESTAMPTZ,
  total_time_ms BIGINT,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'PAUSED', 'FINISHED', 'CANCELED')),
  channel_id TEXT,
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  admin_note TEXT
);

CREATE TABLE IF NOT EXISTS work_logs (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES work_sessions(id),
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON work_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON work_sessions(status);
CREATE INDEX IF NOT EXISTS idx_logs_session ON work_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_logs_user ON work_logs(user_id);
