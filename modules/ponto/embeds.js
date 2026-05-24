const { EmbedBuilder } = require("discord.js");
const { formatDuration, formatDateTime, getSessionActiveMs, getSessionPausedMs, STATUS_LABELS } = require("./time.js");

const OLIVE = 0x556b2f;
const DARK = 0x1a1a1a;

function baseEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(OLIVE)
    .setTitle(`▌ ${title}`)
    .setDescription(description)
    .setFooter({ text: "Exército Brasileiro • Controle Operacional" })
    .setTimestamp();
}

const PANEL_ASCII = [
  "```",
  "╔══════════════════════════════════╗",
  "║   SISTEMA DE BATE-PONTO EB       ║",
  "║   Exército Brasileiro            ║",
  "╚══════════════════════════════════╝",
  "```"
].join("\n");

function buildPublicPanelEmbed(channelName) {
  const lines = [
    PANEL_ASCII,
    `**Canal obrigatório:** \`${channelName}\``,
    "",
    "Utilize os botões abaixo para controlar sua jornada operacional.",
    "",
    "🟢 **Iniciar** — entra em serviço (precisa estar na call)",
    "⏸️ **Pausar** / ▶️ **Retomar** — controla pausas",
    "🔴 **Encerrar** — finaliza o ponto",
    "📋 **Ver histórico** — suas horas registradas"
  ];
  return baseEmbed("Painel Operacional — Bate-Ponto", lines.join("\n"));
}

function buildPanelEmbed(session, channelName, userTag, now = Date.now()) {
  const status = session?.status ?? "NONE";
  const lines = [
    PANEL_ASCII,
    `**Operador:** ${userTag}`,
    `**Canal obrigatório:** \`${channelName}\``,
    ""
  ];

  if (!session) {
    lines.push("**Status:** ⚪ Fora de serviço");
    lines.push("", "Utilize os botões abaixo para controlar sua jornada operacional.");
  } else {
    const activeMs = getSessionActiveMs(session, now);
    const pausedMs = getSessionPausedMs(session, now);
    lines.push(`**Status:** ${STATUS_LABELS[status] || status}`);
    lines.push(`**Início:** ${formatDateTime(session.started_at)}`);
    lines.push(`🕐 **Tempo ativo:** \`${formatDuration(activeMs)}\``);
    lines.push(`⏸️ **Tempo pausado:** \`${formatDuration(pausedMs)}\``);
    if (session.status === "PAUSED") {
      lines.push("", "_Relógio pausado — tempo ativo congelado._");
    } else if (session.status === "ACTIVE") {
      lines.push("", "_Relógio em execução..._");
    }
  }

  return baseEmbed("Painel Operacional — Bate-Ponto", lines.join("\n"));
}

function buildEndSummaryEmbed(session, userTag) {
  const activeMs = session.total_time_ms ?? getSessionActiveMs(session);
  const pausedMs = Number(session.paused_time_ms) || 0;

  const lines = [
    PANEL_ASCII,
    `**Operador:** ${userTag}`,
    "",
    "✅ **Ponto encerrado com sucesso**",
    "",
    `🕐 **Tempo em serviço:** \`${formatDuration(activeMs)}\``,
    `⏸️ **Tempo pausado:** \`${formatDuration(pausedMs)}\``,
    "",
    `**Início:** ${formatDateTime(session.started_at)}`,
    `**Fim:** ${formatDateTime(session.ended_at)}`
  ];

  return baseEmbed("Resumo da Jornada", lines.join("\n")).setColor(0x57f287);
}

function buildCanceledSummaryEmbed(session, userTag) {
  const activeMs = session.total_time_ms ?? getSessionActiveMs(session);
  const pausedMs = Number(session.paused_time_ms) || 0;

  return [
    "❌ **Ponto encerrado automaticamente**",
    "",
    "Você saiu da canaleta operacional.",
    "",
    `🕐 **Tempo em serviço:** \`${formatDuration(activeMs)}\``,
    `⏸️ **Tempo pausado:** \`${formatDuration(pausedMs)}\``,
    "",
    `**Início:** ${formatDateTime(session.started_at)}`,
    `**Fim:** ${formatDateTime(session.ended_at)}`
  ].join("\n");
}

function buildHistoryEmbed(userTag, sessions, totals) {
  const lines = [
    `**Operador:** ${userTag}`,
    "",
    `📊 **Total geral:** \`${formatDuration(totals.all)}\``,
    `📅 **Esta semana:** \`${formatDuration(totals.week)}\``,
    `📆 **Este mês:** \`${formatDuration(totals.month)}\``,
    "",
    "**Últimos registros:**"
  ];

  if (!sessions.length) {
    lines.push("_Nenhum ponto registrado._");
  } else {
    for (const s of sessions.slice(0, 8)) {
      const dur = s.total_time_ms ?? getSessionActiveMs(s);
      lines.push(
        `• ${STATUS_LABELS[s.status] || s.status} — \`${formatDuration(dur)}\` — ${formatDateTime(s.started_at)}`
      );
    }
  }

  const canceled = sessions.filter((s) => s.status === "CANCELED").length;
  if (canceled) lines.push("", `⚠️ **Pontos cancelados (recentes):** ${canceled}`);

  return baseEmbed("Histórico Operacional", lines.join("\n"));
}

function buildRankingEmbed(entries, periodLabel) {
  const lines = [`**Período:** ${periodLabel}`, "", "**Ranking operacional:**"];

  if (!entries.length) {
    lines.push("_Sem registros no período._");
  } else {
    entries.forEach((e, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
      lines.push(`${medal} **${e.username}** — \`${formatDuration(Number(e.total_ms))}\` (${e.session_count} sessões)`);
    });
  }

  return baseEmbed("Ranking Operacional", lines.join("\n"));
}

function buildAdminActiveEmbed(sessions, guild) {
  const lines = ["**Membros em serviço:**", ""];

  if (!sessions.length) {
    lines.push("_Nenhum operador ativo no momento._");
  } else {
    for (const s of sessions) {
      const member = guild.members.cache.get(s.user_id);
      const name = member?.displayName ?? s.user_id;
      const activeMs = getSessionActiveMs(s);
      lines.push(`• **${name}** — ${STATUS_LABELS[s.status]} — \`${formatDuration(activeMs)}\``);
    }
  }

  return baseEmbed("Painel Admin — Ativos", lines.join("\n")).setColor(DARK);
}

function buildLogEmbed(action, userTag, session, extra = "") {
  const dur = session ? formatDuration(session.total_time_ms ?? getSessionActiveMs(session)) : "—";
  return baseEmbed("Log Operacional", [
    `**Ação:** \`${action}\``,
    `**Operador:** ${userTag}`,
    session ? `**Sessão #${session.id}** — ${STATUS_LABELS[session.status] || session.status}` : "",
    session ? `**Tempo:** \`${dur}\`` : "",
    session?.started_at ? `**Início:** ${formatDateTime(session.started_at)}` : "",
    session?.ended_at ? `**Fim:** ${formatDateTime(session.ended_at)}` : "",
    extra ? `\n${extra}` : ""
  ]
    .filter(Boolean)
    .join("\n"));
}

module.exports = {
  buildPublicPanelEmbed,
  buildPanelEmbed,
  buildEndSummaryEmbed,
  buildCanceledSummaryEmbed,
  buildHistoryEmbed,
  buildRankingEmbed,
  buildAdminActiveEmbed,
  buildLogEmbed,
  OLIVE,
  DARK
};
