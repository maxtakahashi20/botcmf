const { EmbedBuilder } = require("discord.js");
const { validateDraft, DEFAULT_COLOR } = require("./validate.js");

function buildEmbedFromDraft(draft, { preview = false } = {}) {
  const data = validateDraft(draft);

  const embed = new EmbedBuilder()
    .setTitle(data.title)
    .setDescription(data.description)
    .setColor(data.color ?? DEFAULT_COLOR)
    .setTimestamp();

  if (data.footer) embed.setFooter({ text: data.footer });
  if (data.imageUrl) embed.setImage(data.imageUrl);
  if (data.thumbnailUrl) embed.setThumbnail(data.thumbnailUrl);

  if (preview) {
    embed.setAuthor({ name: "▌ PREVIEW — Comunicação Operacional EB" });
  }

  return embed;
}

module.exports = { buildEmbedFromDraft };
