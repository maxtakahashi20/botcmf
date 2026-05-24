const path = require("node:path");
const { SqliteAdapter } = require("./sqlite.js");
const { PostgresAdapter } = require("./postgres.js");

function wrapSyncAdapter(adapter) {
  return {
    init: async () => adapter.init(),
    close: async () => adapter.close(),
    upsertUser: async (...a) => adapter.upsertUser(...a),
    getActiveSession: async (...a) => adapter.getActiveSession(...a),
    getSessionById: async (...a) => adapter.getSessionById(...a),
    createSession: async (...a) => adapter.createSession(...a),
    updateSession: async (...a) => adapter.updateSession(...a),
    addLog: async (...a) => adapter.addLog(...a),
    getUserSessions: async (...a) => adapter.getUserSessions(...a),
    getSessionsSince: async (...a) => adapter.getSessionsSince(...a),
    getActiveSessions: async (...a) => adapter.getActiveSessions(...a),
    getRanking: async (...a) => adapter.getRanking(...a),
    getUserTotalMs: async (...a) => adapter.getUserTotalMs(...a),
    deleteSession: async (...a) => adapter.deleteSession(...a),
    getAllSessionsForExport: async (...a) => adapter.getAllSessionsForExport(...a)
  };
}

async function createDatabase() {
  const url = process.env.DATABASE_URL;

  if (url) {
    const pg = new PostgresAdapter(url);
    await pg.init();
    return pg;
  }

  const dbPath = process.env.SQLITE_PATH || path.join(__dirname, "..", "data", "ponto.db");
  const sqlite = new SqliteAdapter(dbPath);
  sqlite.init();
  return wrapSyncAdapter(sqlite);
}

module.exports = { createDatabase };
