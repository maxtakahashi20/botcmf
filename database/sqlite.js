const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

class SqliteAdapter {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
  }

  init() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    this.db = new DatabaseSync(this.dbPath);
    this.db.exec("PRAGMA foreign_keys = ON");

    const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
    this.db.exec(schema);
    return this;
  }

  close() {
    this.db?.close();
  }

  _row(row) {
    if (!row) return null;
    return {
      ...row,
      approved: Boolean(row.approved)
    };
  }

  upsertUser(discordId, username, patente = null, setor = null) {
    this.db
      .prepare(
        `INSERT INTO users (discord_id, username, patente, setor, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))
         ON CONFLICT(discord_id) DO UPDATE SET
           username = excluded.username,
           patente = COALESCE(excluded.patente, users.patente),
           setor = COALESCE(excluded.setor, users.setor),
           updated_at = datetime('now')`
      )
      .run(discordId, username, patente, setor);
  }

  getActiveSession(userId) {
    const row = this.db
      .prepare(
        `SELECT * FROM work_sessions
         WHERE user_id = ? AND status IN ('ACTIVE', 'PAUSED')
         ORDER BY started_at DESC LIMIT 1`
      )
      .get(userId);
    return this._row(row);
  }

  getSessionById(id) {
    return this._row(this.db.prepare("SELECT * FROM work_sessions WHERE id = ?").get(id));
  }

  createSession(userId, channelId) {
    const now = new Date().toISOString();
    const result = this.db
      .prepare(
        `INSERT INTO work_sessions (user_id, started_at, status, channel_id)
         VALUES (?, ?, 'ACTIVE', ?)`
      )
      .run(userId, now, channelId);

    const sessionId = result.lastInsertRowid;
    this.addLog(sessionId, userId, "START", null, "Ponto iniciado");
    return this.getSessionById(sessionId);
  }

  updateSession(id, fields) {
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
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        sets.push(`${key} = ?`);
        values.push(key === "approved" ? (fields[key] ? 1 : 0) : fields[key]);
      }
    }
    if (!sets.length) return this.getSessionById(id);
    values.push(id);
    this.db.prepare(`UPDATE work_sessions SET ${sets.join(", ")} WHERE id = ?`).run(...values);
    return this.getSessionById(id);
  }

  addLog(sessionId, userId, action, reason = null, note = null) {
    const fullReason = [reason, note].filter(Boolean).join(" — ") || null;
    this.db
      .prepare(
        `INSERT INTO work_logs (session_id, user_id, action, reason, timestamp)
         VALUES (?, ?, ?, ?, datetime('now'))`
      )
      .run(sessionId, userId, action, fullReason);
  }

  getUserSessions(userId, limit = 10) {
    return this.db
      .prepare(
        `SELECT * FROM work_sessions WHERE user_id = ?
         ORDER BY started_at DESC LIMIT ?`
      )
      .all(userId, limit)
      .map((r) => this._row(r));
  }

  getSessionsSince(sinceIso, userId = null) {
    if (userId) {
      return this.db
        .prepare(
          `SELECT * FROM work_sessions
           WHERE user_id = ? AND started_at >= ?
           ORDER BY started_at DESC`
        )
        .all(userId, sinceIso)
        .map((r) => this._row(r));
    }
    return this.db
      .prepare(`SELECT * FROM work_sessions WHERE started_at >= ? ORDER BY started_at DESC`)
      .all(sinceIso)
      .map((r) => this._row(r));
  }

  getActiveSessions() {
    return this.db
      .prepare(`SELECT * FROM work_sessions WHERE status IN ('ACTIVE', 'PAUSED') ORDER BY started_at ASC`)
      .all()
      .map((r) => this._row(r));
  }

  getRanking(sinceIso, limit = 10) {
    return this.db
      .prepare(
        `SELECT ws.user_id, u.username,
                SUM(COALESCE(ws.total_time_ms, 0)) AS total_ms,
                COUNT(*) AS session_count
         FROM work_sessions ws
         JOIN users u ON u.discord_id = ws.user_id
         WHERE ws.status IN ('FINISHED', 'CANCELED')
           AND ws.started_at >= ?
           AND ws.total_time_ms IS NOT NULL
         GROUP BY ws.user_id
         ORDER BY total_ms DESC
         LIMIT ?`
      )
      .all(sinceIso, limit);
  }

  getUserTotalMs(userId, sinceIso = null) {
    if (sinceIso) {
      const row = this.db
        .prepare(
          `SELECT COALESCE(SUM(total_time_ms), 0) AS total
           FROM work_sessions
           WHERE user_id = ? AND status IN ('FINISHED', 'CANCELED')
             AND started_at >= ? AND total_time_ms IS NOT NULL`
        )
        .get(userId, sinceIso);
      return row?.total ?? 0;
    }
    const row = this.db
      .prepare(
        `SELECT COALESCE(SUM(total_time_ms), 0) AS total
         FROM work_sessions
         WHERE user_id = ? AND status IN ('FINISHED', 'CANCELED')
           AND total_time_ms IS NOT NULL`
      )
      .get(userId);
    return row?.total ?? 0;
  }

  deleteSession(id) {
    this.db.prepare("DELETE FROM work_logs WHERE session_id = ?").run(id);
    this.db.prepare("DELETE FROM work_sessions WHERE id = ?").run(id);
  }

  getAllSessionsForExport(sinceIso) {
    return this.db
      .prepare(
        `SELECT ws.*, u.username, u.patente, u.setor
         FROM work_sessions ws
         JOIN users u ON u.discord_id = ws.user_id
         WHERE ws.started_at >= ?
         ORDER BY ws.started_at DESC`
      )
      .all(sinceIso)
      .map((r) => this._row(r));
  }
}

module.exports = { SqliteAdapter };
