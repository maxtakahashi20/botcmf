const { SlashCommandBuilder } = require("discord.js");
const { openAdminPanel } = require("../modules/ponto/handlers.js");
const {
  adminResetSession,
  adminApproveSession,
  adminAddHours
} = require("../modules/ponto/service.js");

module.exports = {
  pontoAdmin: true,
  data: new SlashCommandBuilder()
    .setName("ponto-admin")
    .setDescription("Administração do bate-ponto operacional")
    .addSubcommand((sc) => sc.setName("painel").setDescription("Abrir painel administrativo"))
    .addSubcommand((sc) =>
      sc
        .setName("aprovar")
        .setDescription("Aprovar horas de uma sessão")
        .addIntegerOption((opt) =>
          opt.setName("sessao").setDescription("ID da sessão").setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName("remover")
        .setDescription("Remover uma sessão de ponto")
        .addIntegerOption((opt) =>
          opt.setName("sessao").setDescription("ID da sessão").setRequired(true)
        )
    )
    .addSubcommand((sc) =>
      sc
        .setName("adicionar-horas")
        .setDescription("Adicionar minutos manualmente a uma sessão")
        .addIntegerOption((opt) =>
          opt.setName("sessao").setDescription("ID da sessão").setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName("minutos").setDescription("Minutos a adicionar").setRequired(true).setMinValue(1)
        )
    ),

  async execute(client, interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "painel") {
      return openAdminPanel(client, interaction);
    }

    if (sub === "aprovar") {
      await interaction.deferReply({ ephemeral: true });
      const sessionId = interaction.options.getInteger("sessao");
      try {
        const session = await adminApproveSession(client.db, sessionId);
        return interaction.editReply(`✅ Sessão **#${session.id}** aprovada.`);
      } catch (e) {
        return interaction.editReply(`❌ ${e.message}`);
      }
    }

    if (sub === "remover") {
      await interaction.deferReply({ ephemeral: true });
      const sessionId = interaction.options.getInteger("sessao");
      try {
        await adminResetSession(client.db, sessionId, interaction.user.id);
        return interaction.editReply(`✅ Sessão **#${sessionId}** removida.`);
      } catch (e) {
        return interaction.editReply(`❌ ${e.message}`);
      }
    }

    if (sub === "adicionar-horas") {
      await interaction.deferReply({ ephemeral: true });
      const sessionId = interaction.options.getInteger("sessao");
      const minutos = interaction.options.getInteger("minutos");
      try {
        const session = await adminAddHours(client.db, sessionId, minutos * 60 * 1000, `Admin: +${minutos}min`);
        return interaction.editReply(
          `✅ **+${minutos} min** adicionados à sessão **#${session.id}**.`
        );
      } catch (e) {
        return interaction.editReply(`❌ ${e.message}`);
      }
    }
  }
};
