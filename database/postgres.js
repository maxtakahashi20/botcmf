const fs = require("node:fs");
const path = require("node:path");
const { Pool } = require("pg");

class PostgresAdapter {
  constructor(connectionString) {
    this.pool = new Pool({ connectionString, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false });
  }

  async init() {
    const schema = fs.readFileSync(path.join(__dirname, "schema.pg.sql"), "utf8");
    await this.pool.query(schema);
    return this;
  }

  async close() {
    await this.pool.end();
  }

  _row(row) {
    if (!row) return null;
    return {
      ...row,
      id: row.id,
      approved: Boolean(row.approved),
      paused_time_ms: Number(row.paused_time_ms ?? 0),
      total_time_ms: row.total_time_ms != null ? Number(row.total_time_ms) : null
    };
  }

  async upsertUser(discordId, username, patente = null, setor = null) {
    await this.pool.query(
      `INSERT INTO users (discord_id, username, patente, setor)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (discord_id) DO UPDATE SET
         username = EXCLUDED.username,
         patente = COALESCE(EXCLUDED.patente, users.patente),
         setor = COALESCE(EXCLUDED.setor, users.setor),
         updated_at = NOW()`,
      [discordId, username, patente, setor]
    );
  }

  async getActiveSession(userId) {
    const { rows } = await this.pool.query(
      `SELECT * FROM work_sessions
       WHERE user_id = $1 AND status IN ('ACTIVE', 'PAUSED')
       ORDER BY started_at DESC LIMIT 1`,
      [userId]
    );
    return this._row(rows[0]);
  }

  async getSessionById(id) {
    const { rows } = await this.pool.query("SELECT * FROM work_sessions WHERE id = $1", [id]);
    return this._row(rows[0]);
  }

  async createSession(userId, channelId) {
    const now = new Date();
    const { rows } = await this.pool.query(
      `INSERT INTO work_sessions (user_id, started_at, status, channel_id)
       VALUES ($1, $2, 'ACTIVE', $3)
       RETURNING *`,
      [userId, now, channelId]
    );
    const session = this._row(rows[0]);
    await this.addLog(session.id, userId, "START", null, "Ponto iniciado");
    return session;
  }

  async updateSession(id, fields) {
    const allowed = [
      "ended_at",
      "paused_time_ms",
      "pause_started_at",
      "total_time_ms",
      "status",
      "approved",
      "admin_note"
    ];
    const sets = [];
    const values = [];
    let i = 1;
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        sets.push(`${key} = $${i++}`);
        values.push(fields[key]);
      }
    }
    if (!sets.length) return this.getSessionById(id);
    values.push(id);
    await this.pool.query(`UPDATE work_sessions SET ${sets.join(", ")} WHERE id = $${i}`, values);
    return this.getSessionById(id);
  }

  async addLog(sessionId, userId, action, reason = null, note = null) {
    const fullReason = [reason, note].filter(Boolean).join(" — ") || null;
    await this.pool.query(
      `INSERT INTO work_logs (session_id, user_id, action, reason) VALUES ($1, $2, $3, $4)`,
      [sessionId, userId, action, fullReason]
    );
  }

  async getUserSessions(userId, limit = 10) {
    const { rows } = await this.pool.query(
      `SELECT * FROM work_sessions WHERE user_id = $1 ORDER BY started_at DESC LIMIT $2`,
      [userId, limit]
    );
    return rows.map((r) => this._row(r));
  }

  async getSessionsSince(sinceIso, userId = null) {
    if (userId) {
      const { rows } = await this.pool.query(
        `SELECT * FROM work_sessions WHERE user_id = $1 AND started_at >= $2 ORDER BY started_at DESC`,
        [userId, sinceIso]
      );
      return rows.map((r) => this._row(r));
    }
    const { rows } = await this.pool.query(
      `SELECT * FROM work_sessions WHERE started_at >= $1 ORDER BY started_at DESC`,
      [sinceIso]
    );
    return rows.map((r) => this._row(r));
  }

  async getActiveSessions() {
    const { rows } = await this.pool.query(
      `SELECT * FROM work_sessions WHERE status IN ('ACTIVE', 'PAUSED') ORDER BY started_at ASC`
    );
    return rows.map((r) => this._row(r));
  }

  async getRanking(sinceIso, limit = 10) {
    const { rows } = await this.pool.query(
      `SELECT ws.user_id, u.username,
              SUM(COALESCE(ws.total_time_ms, 0))::bigint AS total_ms,
              COUNT(*)::int AS session_count
       FROM work_sessions ws
       JOIN users u ON u.discord_id = ws.user_id
       WHERE ws.status IN ('FINISHED', 'CANCELED')
         AND ws.started_at >= $1
         AND ws.total_time_ms IS NOT NULL
       GROUP BY ws.user_id, u.username
       ORDER BY total_ms DESC
       LIMIT $2`,
      [sinceIso, limit]
    );
    return rows.map((r) => ({ ...r, total_ms: Number(r.total_ms) }));
  }

  async getUserTotalMs(userId, sinceIso = null) {
    if (sinceIso) {
      const { rows } = await this.pool.query(
        `SELECT COALESCE(SUM(total_time_ms), 0)::bigint AS total
         FROM work_sessions
         WHERE user_id = $1 AND status IN ('FINISHED', 'CANCELED')
           AND started_at >= $2 AND total_time_ms IS NOT NULL`,
        [userId, sinceIso]
      );
      return Number(rows[0]?.total ?? 0);
    }
    const { rows } = await this.pool.query(
      `SELECT COALESCE(SUM(total_time_ms), 0)::bigint AS total
       FROM work_sessions
       WHERE user_id = $1 AND status IN ('FINISHED', 'CANCELED')
         AND total_time_ms IS NOT NULL`,
      [userId]
    );
    return Number(rows[0]?.total ?? 0);
  }

  async deleteSession(id) {
    await this.pool.query("DELETE FROM work_logs WHERE session_id = $1", [id]);
    await this.pool.query("DELETE FROM work_sessions WHERE id = $1", [id]);
  }

  async getAllSessionsForExport(sinceIso) {
    const { rows } = await this.pool.query(
      `SELECT ws.*, u.username, u.patente, u.setor
       FROM work_sessions ws
       JOIN users u ON u.discord_id = ws.user_id
       WHERE ws.started_at >= $1
       ORDER BY ws.started_at DESC`,
      [sinceIso]
    );
    return rows.map((r) => this._row(r));
  }
}

module.exports = { PostgresAdapter };
