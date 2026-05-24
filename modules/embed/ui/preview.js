const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require("discord.js");
const { buildEmbedFromDraft } = require("../build.js");
const {
  fetchSendableChannels,
  buildChannelOptions,
  getChannelPageInfo
} = require("./channels.js");

function mentionLabel(mention) {
  if (mention === "everyone") return "`@everyone`";
  if (mention === "here") return "`@here`";
  return "_Sem menção_";
}

async function buildPreviewPayload(guild, state) {
  let previewEmbed;
  try {
    previewEmbed = buildEmbedFromDraft(
      { ...state.draft, thumbnailUrl: state.draft.thumbnailUrl || "" },
      { preview: true }
    );
  } catch (e) {
    previewEmbed = null;
  }

  const channels = state._channels ?? (await fetchSendableChannels(guild));
  state._channels = channels;

  const { totalPages, page } = getChannelPageInfo(channels.length, state.channelPage ?? 0);
  state.channelPage = page;

  const channelText = state.channelId ? `<#${state.channelId}>` : "_Canal não selecionado_";
  const pageInfo =
    channels.length > 25
      ? `\n📄 Canais **${page + 1}/${totalPages}** (${channels.length} disponíveis)`
      : `\n📄 **${channels.length}** canal(is) disponível(is)`;

  const content = [
    "📋 **Preview — Embed Operacional**",
    "",
    `📢 **Canal:** ${channelText}`,
    `📣 **Menção:** ${mentionLabel(state.mention)}`,
    pageInfo,
    previewEmbed ? "" : `⚠️ ${state._error || "Erro ao montar preview."}`
  ]
    .filter((l) => l !== undefined)
    .join("\n");

  const channelSelect = new StringSelectMenuBuilder()
    .setCustomId("embed_select_channel")
    .setPlaceholder(`Selecione o canal (${channels.length} disponíveis)`)
    .addOptions(buildChannelOptions(channels, page, state.channelId));

  const mentionSelect = new StringSelectMenuBuilder()
    .setCustomId("embed_select_mention")
    .setPlaceholder("Menção ao enviar")
    .addOptions(
      { label: "Sem menção", value: "none", default: state.mention === "none" },
      { label: "@everyone", value: "everyone", default: state.mention === "everyone" },
      { label: "@here", value: "here", default: state.mention === "here" }
    );

  const components = [
    new ActionRowBuilder().addComponents(channelSelect),
    new ActionRowBuilder().addComponents(mentionSelect)
  ];

  if (totalPages > 1) {
    components.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("embed_channel_prev")
          .setLabel("Canais anteriores")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("◀️")
          .setDisabled(page <= 0),
        new ButtonBuilder()
          .setCustomId("embed_channel_next")
          .setLabel("Próximos canais")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("▶️")
          .setDisabled(page >= totalPages - 1)
      )
    );
  }

  components.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("embed_confirm")
        .setLabel("Confirmar envio")
        .setStyle(ButtonStyle.Success)
        .setEmoji("✅"),
      new ButtonBuilder()
        .setCustomId("embed_edit")
        .setLabel("Editar")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("✏️"),
      new ButtonBuilder()
        .setCustomId("embed_thumbnail")
        .setLabel("Thumbnail")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🖼️"),
      new ButtonBuilder()
        .setCustomId("embed_cancel")
        .setLabel("Cancelar")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("❌")
    )
  );

  return {
    content,
    embeds: previewEmbed ? [previewEmbed] : [],
    components
  };
}

module.exports = { buildPreviewPayload, mentionLabel };
