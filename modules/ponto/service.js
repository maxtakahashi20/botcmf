const { getSessionActiveMs } = require("./time.js");

class PontoError extends Error {
  constructor(message, code = "PONTO_ERROR") {
    super(message);
    this.code = code;
  }
}

function getPontoConfig(config) {
  return config.ponto ?? {};
}

function isInOperationalChannel(member, pontoConfig) {
  const channelId = pontoConfig.operationalVoiceChannelId;
  if (!channelId) return { ok: false, reason: "Canal operacional não configurado no bot." };
  const voiceChannelId = member?.voice?.channelId;
  if (!voiceChannelId) {
    return {
      ok: false,
      reason:
        `Você precisa estar na canaleta operacional para iniciar seu ponto.\n` +
        `Canal obrigatório: **${pontoConfig.operationalVoiceChannelName || "Operações RP"}**`
    };
  }
  if (voiceChannelId !== channelId) {
    return {
      ok: false,
      reason:
        `Você precisa estar na canaleta operacional para iniciar seu ponto.\n` +
        `Canal obrigatório: **${pontoConfig.operationalVoiceChannelName || "Operações RP"}**`
    };
  }
  return { ok: true, channelId: voiceChannelId };
}

async function syncUser(db, member) {
  const patente = member.displayName?.split("|")[0]?.trim() || null;
  await db.upsertUser(member.id, member.user.username, patente, null);
}

async function startSession(db, member, config) {
  const ponto = getPontoConfig(config);
  const check = isInOperationalChannel(member, ponto);
  if (!check.ok) throw new PontoError(check.reason, "NOT_IN_CHANNEL");

  const existing = await db.getActiveSession(member.id);
  if (existing) throw new PontoError("Você já possui um ponto em andamento.", "ALREADY_ACTIVE");

  await syncUser(db, member);
  return db.createSession(member.id, check.channelId);
}

async function pauseSession(db, userId) {
  const session = await db.getActiveSession(userId);
  if (!session) throw new PontoError("Nenhum ponto ativo encontrado.", "NO_SESSION");
  if (session.status === "PAUSED") throw new PontoError("O ponto já está pausado.", "ALREADY_PAUSED");
  if (session.status !== "ACTIVE") throw new PontoError("Não é possível pausar este ponto.", "INVALID_STATUS");

  const updated = await db.updateSession(session.id, {
    status: "PAUSED",
    pause_started_at: new Date().toISOString()
  });
  await db.addLog(session.id, userId, "PAUSE", null, "Ponto pausado");
  return updated;
}

async function resumeSession(db, userId) {
  const session = await db.getActiveSession(userId);
  if (!session) throw new PontoError("Nenhum ponto ativo encontrado.", "NO_SESSION");
  if (session.status !== "PAUSED") throw new PontoError("O ponto não está pausado.", "NOT_PAUSED");

  let pausedMs = Number(session.paused_time_ms) || 0;
  if (session.pause_started_at) {
    pausedMs += Date.now() - new Date(session.pause_started_at).getTime();
  }

  const updated = await db.updateSession(session.id, {
    status: "ACTIVE",
    paused_time_ms: pausedMs,
    pause_started_at: null
  });
  await db.addLog(session.id, userId, "RESUME", null, "Ponto retomado");
  return updated;
}

async function endSession(db, userId, status = "FINISHED", reason = null) {
  const session = await db.getActiveSession(userId);
  if (!session) throw new PontoError("Nenhum ponto ativo encontrado.", "NO_SESSION");

  const now = new Date();
  let pausedMs = Number(session.paused_time_ms) || 0;
  if (session.status === "PAUSED" && session.pause_started_at) {
    pausedMs += now.getTime() - new Date(session.pause_started_at).getTime();
  }

  const totalMs = getSessionActiveMs({ ...session, ended_at: now.toISOString(), paused_time_ms: pausedMs });

  const updated = await db.updateSession(session.id, {
    status,
    ended_at: now.toISOString(),
    paused_time_ms: pausedMs,
    pause_started_at: null,
    total_time_ms: totalMs
  });

  const action = status === "CANCELED" ? "AUTO_CANCEL" : "END";
  await db.addLog(session.id, userId, action, reason, status === "CANCELED" ? "Cancelado automaticamente" : "Ponto encerrado");
  return updated;
}

async function cancelSessionAuto(db, userId, reason) {
  const session = await db.getActiveSession(userId);
  if (!session) return null;
  return endSession(db, userId, "CANCELED", reason);
}

async function getUserHistory(db, userId) {
  const { getWeekStart, getMonthStart } = require("./time.js");
  const sessions = await db.getUserSessions(userId, 15);
  const week = await db.getUserTotalMs(userId, getWeekStart());
  const month = await db.getUserTotalMs(userId, getMonthStart());
  const all = await db.getUserTotalMs(userId);
  return { sessions, totals: { week, month, all } };
}

async function adminAddHours(db, sessionId, extraMs, note) {
  const session = await db.getSessionById(sessionId);
  if (!session) throw new PontoError("Sessão não encontrada.", "NOT_FOUND");
  const newTotal = (Number(session.total_time_ms) || 0) + extraMs;
  const updated = await db.updateSession(sessionId, {
    total_time_ms: newTotal,
    admin_note: note || session.admin_note
  });
  await db.addLog(sessionId, session.user_id, "ADMIN_ADD_HOURS", note, `+${extraMs}ms`);
  return updated;
}

async function adminResetSession(db, sessionId, adminId) {
  const session = await db.getSessionById(sessionId);
  if (!session) throw new PontoError("Sessão não encontrada.", "NOT_FOUND");
  await db.addLog(sessionId, session.user_id, "ADMIN_RESET", `Por admin ${adminId}`, "Sessão removida");
  await db.deleteSession(sessionId);
}

async function adminApproveSession(db, sessionId) {
  const session = await db.getSessionById(sessionId);
  if (!session) throw new PontoError("Sessão não encontrada.", "NOT_FOUND");
  const updated = await db.updateSession(sessionId, { approved: true });
  await db.addLog(sessionId, session.user_id, "ADMIN_APPROVE", null, "Horas aprovadas");
  return updated;
}

module.exports = {
  PontoError,
  getPontoConfig,
  isInOperationalChannel,
  startSession,
  pauseSession,
  resumeSession,
  endSession,
  cancelSessionAuto,
  getUserHistory,
  adminAddHours,
  adminResetSession,
  adminApproveSession
};
