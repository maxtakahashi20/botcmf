const { EmbedBuilder } = require("discord.js");
const { getEmbedConfig } = require("./permissions.js");

async function logEmbedSend(client, interaction, state, messageUrl) {
  const { logsChannelId } = getEmbedConfig(client.config);
  if (!logsChannelId) return;

  const channel = await client.channels.fetch(logsChannelId).catch(() => null);
  if (!channel?.isTextBased()) return;

  const mentionLabel =
    state.mention === "everyone" ? "@everyone" : state.mention === "here" ? "@here" : "Nenhuma";

  const logEmbed = new EmbedBuilder()
    .setColor(0x1a1a1a)
    .setTitle("▌ Log — Embed enviada")
    .addFields(
      { name: "Enviado por", value: `<@${interaction.user.id}> (\`${interaction.user.tag}\`)`, inline: false },
      { name: "Canal", value: `<#${state.channelId}>`, inline: true },
      { name: "Menção", value: mentionLabel, inline: true },
      { name: "Título", value: state.draft.title?.slice(0, 256) || "—", inline: false },
      {
        name: "Descrição",
        value: state.draft.description?.slice(0, 1024) || "—",
        inline: false
      },
      { name: "Link", value: messageUrl ? `[Ir para mensagem](${messageUrl})` : "—", inline: false }
    )
    .setTimestamp();

  await channel.send({ embeds: [logEmbed] }).catch(() => {});
}

module.exports = { logEmbedSend };
