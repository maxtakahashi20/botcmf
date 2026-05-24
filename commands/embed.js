const { SlashCommandBuilder } = require("discord.js");
const { handleEmbedSlash } = require("../modules/embed/handlers.js");

module.exports = {
  embedAdmin: true,
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Enviar embed profissional via modal interativo (staff)"),

  async execute(client, interaction) {
    return handleEmbedSlash(interaction);
  }
};
