const fs = require("node:fs");
const {
  startSession,
  pauseSession,
  resumeSession,
  endSession,
  getUserHistory,
  PontoError,
  getPontoConfig,
  adminResetSession,
  adminApproveSession
} = require("../ponto/service.js");
const {
  buildPanelEmbed,
  buildHistoryEmbed,
  buildRankingEmbed,
  buildAdminActiveEmbed,
  buildPublicPanelEmbed,
  buildEndSummaryEmbed
} = require("../ponto/embeds.js");
const { buildPanelButtons, buildPublicPanelButtons, buildAdminButtons } = require("../painel/buttons.js");
const { sendPontoLog } = require("../logs/logger.js");
const { startLiveClock, stopLiveClock } = require("../ponto/liveClock.js");
const { writeTempCsv, buildWeeklyReportText } = require("../ponto/export.js");
const { getWeekStart, getMonthStart } = require("../ponto/time.js");
const { assertPontoAdmin } = require("../../utils/permissions.js");

function isPontoButton(customId) {
  return customId.startsWith("ponto_");
}

async function replyUserPanel(interaction, client, session, { live = true } = {}) {
  const ponto = getPontoConfig(client.config);
  const channelName = ponto.operationalVoiceChannelName || "Operações RP";
  const embed = buildPanelEmbed(session, channelName, interaction.user.tag, Date.now());
  const components = buildPanelButtons(session);
  await interaction.editReply({ embeds: [embed], components });

  if (live && session && ["ACTIVE", "PAUSED"].includes(session.status)) {
    startLiveClock(interaction, client, session);
  } else {
    stopLiveClock(interaction.user.id);
  }
}

async function replyEndSummary(interaction, client, session) {
  stopLiveClock(interaction.user.id);
  const embed = buildEndSummaryEmbed(session, interaction.user.tag);
  const components = buildPanelButtons(null);
  return interaction.editReply({ embeds: [embed], components });
}

async function handlePontoInteraction(client, interaction) {
  const { customId } = interaction;

  if (customId === "ponto_start") {
    await interaction.deferReply({ ephemeral: true });
    try {
      const session = await startSession(client.db, interaction.member, client.config);
      await sendPontoLog(client, "INÍCIO", interaction.user, session);
      return replyUserPanel(interaction, client, session);
    } catch (e) {
      return interaction.editReply({ content: `❌ ${e.message}`, embeds: [], components: [] });
    }
  }

  if (customId === "ponto_pause") {
    await interaction.deferReply({ ephemeral: true });
    try {
      const session = await pauseSession(client.db, interaction.user.id);
      await sendPontoLog(client, "PAUSA", interaction.user, session);
      return replyUserPanel(interaction, client, session);
    } catch (e) {
      return interaction.editReply({ content: `❌ ${e.message}`, embeds: [], components: [] });
    }
  }

  if (customId === "ponto_resume") {
    await interaction.deferReply({ ephemeral: true });
    try {
      const session = await resumeSession(client.db, interaction.user.id);
      await sendPontoLog(client, "RETORNO", interaction.user, session);
      return replyUserPanel(interaction, client, session);
    } catch (e) {
      return interaction.editReply({ content: `❌ ${e.message}`, embeds: [], components: [] });
    }
  }

  if (customId === "ponto_end") {
    await interaction.deferReply({ ephemeral: true });
    try {
      const session = await endSession(client.db, interaction.user.id);
      await sendPontoLog(client, "ENCERRAMENTO", interaction.user, session);
      return replyEndSummary(interaction, client, session);
    } catch (e) {
      return interaction.editReply({ content: `❌ ${e.message}`, embeds: [], components: [] });
    }
  }

  if (customId === "ponto_history") {
    stopLiveClock(interaction.user.id);
    await interaction.deferReply({ ephemeral: true });
    const { sessions, totals } = await getUserHistory(client.db, interaction.user.id);
    const embed = buildHistoryEmbed(interaction.user.tag, sessions, totals);
    return interaction.editReply({ embeds: [embed], components: [] });
  }

  // ── Admin buttons ──
  if (customId.startsWith("ponto_admin_")) {
    try {
      assertPontoAdmin(interaction, client.config);
    } catch {
      return interaction.reply({
        content: "🚫 Este painel é exclusivo para administradores do bate-ponto.",
        ephemeral: true
      });
    }

    if (customId === "ponto_admin_ativos") {
      await interaction.deferReply({ ephemeral: true });
      const sessions = await client.db.getActiveSessions();
      const embed = buildAdminActiveEmbed(sessions, interaction.guild);
      return interaction.editReply({ embeds: [embed] });
    }

    if (customId === "ponto_admin_ranking") {
      await interaction.deferReply({ ephemeral: true });
      const entries = await client.db.getRanking(getWeekStart(), 15);
      const embed = buildRankingEmbed(entries, "Semana atual");
      return interaction.editReply({ embeds: [embed] });
    }

    if (customId === "ponto_admin_ranking_mes") {
      await interaction.deferReply({ ephemeral: true });
      const entries = await client.db.getRanking(getMonthStart(), 15);
      const embed = buildRankingEmbed(entries, "Mês atual");
      return interaction.editReply({ embeds: [embed] });
    }

    if (customId === "ponto_admin_export_csv") {
      await interaction.deferReply({ ephemeral: true });
      const sessions = await client.db.getAllSessionsForExport(getMonthStart());
      const filePath = await writeTempCsv(sessions, `ponto-mensal-${Date.now()}.csv`);
      await interaction.editReply({
        content: `📁 Exportação mensal — ${sessions.length} registro(s).`,
        files: [{ attachment: filePath, name: "relatorio-ponto-mensal.csv" }]
      });
      fs.unlinkSync(filePath);
      return;
    }

    if (customId === "ponto_admin_export_semana") {
      await interaction.deferReply({ ephemeral: true });
      const sessions = await client.db.getAllSessionsForExport(getWeekStart());
      const report = buildWeeklyReportText(sessions);
      const filePath = require("node:path").join(require("node:os").tmpdir(), `relatorio-semanal-${Date.now()}.txt`);
      fs.writeFileSync(filePath, report, "utf8");
      await interaction.editReply({
        content: `📅 Relatório semanal — ${sessions.length} registro(s).`,
        files: [{ attachment: filePath, name: "relatorio-semanal.txt" }]
      });
      fs.unlinkSync(filePath);
      return;
    }
  }
}

async function sendPublicPontoPanel(client, interaction) {
  await interaction.deferReply({ ephemeral: true });

  const ponto = getPontoConfig(client.config);
  const channelId = ponto.panelChannelId;
  if (!channelId) {
    return interaction.editReply("❌ `ponto.panelChannelId` não configurado em `config/config.json`.");
  }

  const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    return interaction.editReply("❌ Canal do painel de ponto não encontrado. Verifique `ponto.panelChannelId`.");
  }

  const embed = buildPublicPanelEmbed(ponto.operationalVoiceChannelName || "Operações RP");
  const components = buildPublicPanelButtons();

  await channel.send({ embeds: [embed], components });
  return interaction.editReply(`✅ Painel de bate-ponto enviado em <#${channelId}>.`);
}

async function openPontoPanel(client, interaction) {
  await interaction.deferReply({ ephemeral: true });
  const session = await client.db.getActiveSession(interaction.user.id);
  return replyUserPanel(interaction, client, session);
}

async function openAdminPanel(client, interaction) {
  assertPontoAdmin(interaction, client.config);
  const embed = buildAdminActiveEmbed(await client.db.getActiveSessions(), interaction.guild);
  const components = buildAdminButtons();
  return interaction.reply({ embeds: [embed], components, ephemeral: true });
}

module.exports = {
  isPontoButton,
  handlePontoInteraction,
  sendPublicPontoPanel,
  openPontoPanel,
  openAdminPanel,
  PontoError
};
