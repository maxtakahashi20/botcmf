const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

function buildPublicPanelButtons() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ponto_start")
      .setLabel("Iniciar ponto")
      .setStyle(ButtonStyle.Success)
      .setEmoji("🟢"),
    new ButtonBuilder()
      .setCustomId("ponto_pause")
      .setLabel("Pausar ponto")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("⏸️"),
    new ButtonBuilder()
      .setCustomId("ponto_resume")
      .setLabel("Retomar ponto")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("▶️"),
    new ButtonBuilder()
      .setCustomId("ponto_end")
      .setLabel("Encerrar ponto")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🔴")
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ponto_history")
      .setLabel("Ver histórico")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("📋")
  );

  return [row1, row2];
}

function buildPanelButtons(session) {
  const status = session?.status;
  const inService = status === "ACTIVE" || status === "PAUSED";

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ponto_start")
      .setLabel("Iniciar ponto")
      .setStyle(ButtonStyle.Success)
      .setEmoji("🟢")
      .setDisabled(Boolean(inService)),
    new ButtonBuilder()
      .setCustomId("ponto_pause")
      .setLabel("Pausar ponto")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("⏸️")
      .setDisabled(!session || session.status !== "ACTIVE"),
    new ButtonBuilder()
      .setCustomId("ponto_resume")
      .setLabel("Retomar ponto")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("▶️")
      .setDisabled(!session || session.status !== "PAUSED"),
    new ButtonBuilder()
      .setCustomId("ponto_end")
      .setLabel("Encerrar ponto")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🔴")
      .setDisabled(!inService)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ponto_history")
      .setLabel("Ver histórico")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("📋")
  );

  return [row1, row2];
}

function buildAdminButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ponto_admin_ativos")
        .setLabel("Membros ativos")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("👥"),
      new ButtonBuilder()
        .setCustomId("ponto_admin_ranking")
        .setLabel("Ranking semanal")
        .setStyle(ButtonStyle.Success)
        .setEmoji("🏆"),
      new ButtonBuilder()
        .setCustomId("ponto_admin_ranking_mes")
        .setLabel("Ranking mensal")
        .setStyle(ButtonStyle.Success)
        .setEmoji("📊")
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ponto_admin_export_csv")
        .setLabel("Exportar CSV")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("📁"),
      new ButtonBuilder()
        .setCustomId("ponto_admin_export_semana")
        .setLabel("Relatório semanal")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("📅")
    )
  ];
}

module.exports = { buildPublicPanelButtons, buildPanelButtons, buildAdminButtons };
