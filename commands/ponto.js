const { SlashCommandBuilder } = require("discord.js");
const { sendPublicPontoPanel } = require("../modules/ponto/handlers.js");
const { buildHistoryEmbed, buildRankingEmbed } = require("../modules/ponto/embeds.js");
const { getUserHistory } = require("../modules/ponto/service.js");
const { getWeekStart, getMonthStart } = require("../modules/ponto/time.js");
const { assertAllowed } = require("../utils/permissions.js");

module.exports = {
  public: true,
  data: new SlashCommandBuilder()
    .setName("ponto")
    .setDescription("Sistema de bate-ponto operacional — Exército Brasileiro")
    .addSubcommand((sc) =>
      sc.setName("painel").setDescription("Enviar painel de bate-ponto no canal configurado (staff)")
    )
    .addSubcommand((sc) => sc.setName("historico").setDescription("Ver seu histórico de pontos"))
    .addSubcommand((sc) =>
      sc
        .setName("ranking")
        .setDescription("Ver ranking operacional")
        .addStringOption((opt) =>
          opt
            .setName("periodo")
            .setDescription("Período do ranking")
            .setRequired(false)
            .addChoices(
              { name: "Semana", value: "week" },
              { name: "Mês", value: "month" }
            )
        )
    ),

  async execute(client, interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "painel") {
      try {
        assertAllowed(interaction, client.config);
      } catch {
        return interaction.reply({
          content: "🚫 Você não tem permissão para enviar o painel de ponto.",
          ephemeral: true
        });
      }
      return sendPublicPontoPanel(client, interaction);
    }

    if (sub === "historico") {
      await interaction.deferReply({ ephemeral: true });
      const { sessions, totals } = await getUserHistory(client.db, interaction.user.id);
      const embed = buildHistoryEmbed(interaction.user.tag, sessions, totals);
      return interaction.editReply({ embeds: [embed] });
    }

    if (sub === "ranking") {
      await interaction.deferReply({ ephemeral: true });
      const periodo = interaction.options.getString("periodo") || "week";
      const since = periodo === "month" ? getMonthStart() : getWeekStart();
      const label = periodo === "month" ? "Mês atual" : "Semana atual";
      const entries = await client.db.getRanking(since, 15);
      const embed = buildRankingEmbed(entries, label);
      return interaction.editReply({ embeds: [embed] });
    }
  }
};
