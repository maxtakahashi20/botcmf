const STATUS_LABELS = {
  ACTIVE: "🟢 EM SERVIÇO",
  PAUSED: "🟡 PAUSADO",
  FINISHED: "✅ ENCERRADO",
  CANCELED: "❌ CANCELADO"
};

function formatDuration(ms) {
  if (ms == null || ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function getSessionActiveMs(session, now = Date.now()) {
  const start = new Date(session.started_at).getTime();
  let pausedMs = Number(session.paused_time_ms) || 0;

  if (session.status === "PAUSED" && session.pause_started_at) {
    pausedMs += now - new Date(session.pause_started_at).getTime();
  }

  const end = session.ended_at ? new Date(session.ended_at).getTime() : now;
  return Math.max(0, end - start - pausedMs);
}

function getSessionPausedMs(session, now = Date.now()) {
  let pausedMs = Number(session.paused_time_ms) || 0;
  if (session.status === "PAUSED" && session.pause_started_at) {
    pausedMs += now - new Date(session.pause_started_at).getTime();
  }
  return pausedMs;
}

function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diff);
  return d.toISOString();
}

function getMonthStart() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

module.exports = {
  STATUS_LABELS,
  formatDuration,
  formatDateTime,
  getSessionActiveMs,
  getSessionPausedMs,
  getWeekStart,
  getMonthStart
};
