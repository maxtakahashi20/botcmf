const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");

function buildMainModal(draft = null, customId = "embed_modal_create") {
  const modal = new ModalBuilder().setCustomId(customId).setTitle("Embed — Comunicação Operacional");

  const title = new TextInputBuilder()
    .setCustomId("embed_title")
    .setLabel("Título da embed")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(256)
    .setPlaceholder("Ex: Comunicado Oficial — Exército Brasileiro");

  const description = new TextInputBuilder()
    .setCustomId("embed_description")
    .setLabel("Mensagem da embed")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(4000)
    .setPlaceholder("Suporta **markdown**, emojis e quebras de linha.");

  const color = new TextInputBuilder()
    .setCustomId("embed_color")
    .setLabel("Cor da embed (opcional)")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(7)
    .setPlaceholder("#556b2f");

  const footer = new TextInputBuilder()
    .setCustomId("embed_footer")
    .setLabel("Rodapé (opcional)")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(2048)
    .setPlaceholder("Ex: Exército Brasileiro • CMF");

  const image = new TextInputBuilder()
    .setCustomId("embed_image")
    .setLabel("URL da imagem (opcional)")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(2048)
    .setPlaceholder("https://...");

  if (draft) {
    title.setValue(draft.title?.slice(0, 256) || "");
    description.setValue(draft.description?.slice(0, 4000) || "");
    if (draft.color) color.setValue(draft.color);
    if (draft.footer) footer.setValue(draft.footer.slice(0, 2048));
    if (draft.imageUrl) image.setValue(draft.imageUrl.slice(0, 2048));
  }

  modal.addComponents(
    new ActionRowBuilder().addComponents(title),
    new ActionRowBuilder().addComponents(description),
    new ActionRowBuilder().addComponents(color),
    new ActionRowBuilder().addComponents(footer),
    new ActionRowBuilder().addComponents(image)
  );

  return modal;
}

function buildThumbnailModal(currentUrl = "") {
  const modal = new ModalBuilder().setCustomId("embed_modal_thumbnail").setTitle("Embed — Thumbnail");

  const thumbnail = new TextInputBuilder()
    .setCustomId("embed_thumbnail")
    .setLabel("URL da thumbnail")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(2048)
    .setPlaceholder("https://...");

  if (currentUrl) thumbnail.setValue(currentUrl.slice(0, 2048));

  modal.addComponents(new ActionRowBuilder().addComponents(thumbnail));
  return modal;
}

function parseMainModal(interaction) {
  return {
    title: interaction.fields.getTextInputValue("embed_title"),
    description: interaction.fields.getTextInputValue("embed_description"),
    color: interaction.fields.getTextInputValue("embed_color") || "#556b2f",
    footer: interaction.fields.getTextInputValue("embed_footer") || "",
    imageUrl: interaction.fields.getTextInputValue("embed_image") || "",
    thumbnailUrl: undefined
  };
}

module.exports = { buildMainModal, buildThumbnailModal, parseMainModal };
