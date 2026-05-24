const { PermissionFlagsBits } = require("discord.js");
const { assertEmbedAllowed } = require("./permissions.js");
const { createDraft, getDraft, setDraft, clearDraft } = require("./store.js");
const { buildEmbedFromDraft } = require("./build.js");
const { validateDraft, parseUrl } = require("./validate.js");
const { buildMainModal, buildThumbnailModal, parseMainModal } = require("./ui/modal.js");
const { buildPreviewPayload } = require("./ui/preview.js");
const { logEmbedSend } = require("./logs.js");

function isEmbedInteraction(interaction) {
  const id = interaction.customId;
  return typeof id === "string" && id.startsWith("embed_");
}

async function showPreview(interaction, state) {
  const payload = await buildPreviewPayload(interaction.guild, state);
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply({ ...payload, ephemeral: true });
  }
  return interaction.reply({ ...payload, ephemeral: true });
}

async function handleEmbedSlash(interaction) {
  assertEmbedAllowed(interaction, interaction.client.config);
  const state = createDraft(interaction.user.id);
  setDraft(interaction.user.id, state);
  return interaction.showModal(buildMainModal());
}

async function handleEmbedModal(interaction) {
  assertEmbedAllowed(interaction, interaction.client.config);

  const userId = interaction.user.id;
  let state = getDraft(userId) || createDraft(userId);

  if (interaction.customId === "embed_modal_create" || interaction.customId === "embed_modal_edit") {
    await interaction.deferReply({ ephemeral: true });
    try {
      const parsed = parseMainModal(interaction);
      state.draft = { ...state.draft, ...parsed };
      validateDraft(state.draft);
      delete state._error;
    } catch (e) {
      state._error = e.message;
    }
    setDraft(userId, state);
    return showPreview(interaction, state);
  }

  if (interaction.customId === "embed_modal_thumbnail") {
    await interaction.deferReply({ ephemeral: true });
    const thumb = interaction.fields.getTextInputValue("embed_thumbnail") || "";
    try {
      state.draft.thumbnailUrl = thumb ? parseUrl(thumb, "URL da thumbnail") : "";
      delete state._error;
      validateDraft(state.draft);
    } catch (e) {
      state._error = e.message;
    }
    setDraft(userId, state);
    return showPreview(interaction, state);
  }
}

async function handleEmbedSelect(interaction) {
  assertEmbedAllowed(interaction, interaction.client.config);
  const state = getDraft(interaction.user.id);
  if (!state) {
    return interaction.reply({
      content: "❌ Sessão expirada. Use `/embed` novamente.",
      ephemeral: true
    });
  }

  if (interaction.customId === "embed_select_channel") {
    const channelId = interaction.values[0];
    if (channelId === "none") {
      return interaction.reply({ content: "❌ Nenhum canal disponível.", ephemeral: true });
    }
    state.channelId = channelId;
    setDraft(interaction.user.id, state);
    const payload = await buildPreviewPayload(interaction.guild, state);
    return interaction.update(payload);
  }

  if (interaction.customId === "embed_select_mention") {
    state.mention = interaction.values[0];
    setDraft(interaction.user.id, state);
    const payload = await buildPreviewPayload(interaction.guild, state);
    return interaction.update(payload);
  }
}

async function handleEmbedButton(interaction) {
  assertEmbedAllowed(interaction, interaction.client.config);
  const userId = interaction.user.id;
  const state = getDraft(userId);

  if (!state && interaction.customId !== "embed_cancel") {
    return interaction.reply({
      content: "❌ Sessão expirada. Use `/embed` novamente.",
      ephemeral: true
    });
  }

  if (interaction.customId === "embed_cancel") {
    clearDraft(userId);
    return interaction.update({
      content: "❌ Envio de embed cancelado.",
      embeds: [],
      components: []
    });
  }

  if (interaction.customId === "embed_edit") {
    return interaction.showModal(buildMainModal(state.draft, "embed_modal_edit"));
  }

  if (interaction.customId === "embed_channel_prev") {
    state.channelPage = Math.max(0, (state.channelPage ?? 0) - 1);
    setDraft(userId, state);
    const payload = await buildPreviewPayload(interaction.guild, state);
    return interaction.update(payload);
  }

  if (interaction.customId === "embed_channel_next") {
    state.channelPage = (state.channelPage ?? 0) + 1;
    setDraft(userId, state);
    const payload = await buildPreviewPayload(interaction.guild, state);
    return interaction.update(payload);
  }

  if (interaction.customId === "embed_thumbnail") {
    return interaction.showModal(buildThumbnailModal(state.draft.thumbnailUrl));
  }

  if (interaction.customId === "embed_confirm") {
    await interaction.deferUpdate();

    if (!state.channelId) {
      return interaction.followUp({
        content: "❌ Selecione um canal antes de confirmar.",
        ephemeral: true
      });
    }

    let embed;
    try {
      embed = buildEmbedFromDraft(state.draft);
      validateDraft(state.draft);
    } catch (e) {
      return interaction.followUp({ content: `❌ ${e.message}`, ephemeral: true });
    }

    const target = await interaction.guild.channels.fetch(state.channelId).catch(() => null);
    if (!target?.isTextBased()) {
      return interaction.followUp({ content: "❌ Canal inválido ou inacessível.", ephemeral: true });
    }

    const me = interaction.guild.members.me;
    const perms = target.permissionsFor(me);
    if (!perms?.has(PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages)) {
      return interaction.followUp({
        content: "❌ O bot não tem permissão para enviar mensagens nesse canal.",
        ephemeral: true
      });
    }

    if (state.mention !== "none" && !perms.has(PermissionFlagsBits.MentionEveryone)) {
      return interaction.followUp({
        content: "❌ O bot não tem permissão para mencionar @everyone/@here nesse canal.",
        ephemeral: true
      });
    }

    const content =
      state.mention === "everyone" ? "@everyone" : state.mention === "here" ? "@here" : null;

    try {
      const sent = await target.send({
        content: content ?? undefined,
        embeds: [embed],
        allowedMentions: state.mention === "none" ? { parse: [] } : { parse: ["everyone"] }
      });

      await logEmbedSend(interaction.client, interaction, state, sent.url);
      clearDraft(userId);

      await interaction.editReply({
        content: `✅ Embed enviada em ${target}.\n${content ? `Menção: ${content}` : ""}`,
        embeds: [],
        components: []
      });
    } catch (e) {
      return interaction.followUp({
        content: `❌ Falha ao enviar: ${e.message}`,
        ephemeral: true
      });
    }
  }
}

async function handleEmbedInteraction(client, interaction) {
  if (interaction.isModalSubmit()) return handleEmbedModal(interaction);
  if (interaction.isStringSelectMenu()) return handleEmbedSelect(interaction);
  if (interaction.isButton()) return handleEmbedButton(interaction);
}

module.exports = {
  isEmbedInteraction,
  handleEmbedSlash,
  handleEmbedInteraction
};
