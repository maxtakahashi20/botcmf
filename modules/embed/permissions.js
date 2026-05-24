const { memberHasAnyRole } = require("../../utils/permissions.js");

function getEmbedConfig(config) {
  const envRoles = process.env.EMBED_ALLOWED_ROLES?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const allowedRoleIds = envRoles?.length
    ? envRoles
    : config.embed?.allowedRoleIds?.length
      ? config.embed.allowedRoleIds
      : config.allowedRoleIds ?? [];

  const logsChannelId =
    process.env.EMBED_LOG_CHANNEL?.trim() || config.embed?.logsChannelId || "";

  return { allowedRoleIds, logsChannelId };
}

function assertEmbedAllowed(interaction, config) {
  const { allowedRoleIds } = getEmbedConfig(config);
  if (!allowedRoleIds.length || !memberHasAnyRole(interaction.member, allowedRoleIds)) {
    const err = new Error("FORBIDDEN");
    err.code = "FORBIDDEN";
    throw err;
  }
}

module.exports = { getEmbedConfig, assertEmbedAllowed };
