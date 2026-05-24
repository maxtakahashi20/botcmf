const { ChannelType, PermissionFlagsBits } = require("discord.js");

const PER_PAGE = 25;

const SENDABLE_TYPES = new Set([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.GuildForum,
  ChannelType.PublicThread,
  ChannelType.PrivateThread,
  ChannelType.AnnouncementThread
]);

function isSendableChannel(channel) {
  if (typeof channel.isTextBased === "function" && channel.isTextBased()) return true;
  return SENDABLE_TYPES.has(channel.type);
}

async function fetchSendableChannels(guild) {
  await guild.channels.fetch();
  const me = guild.members.me ?? (await guild.members.fetchMe());

  return [...guild.channels.cache.values()]
    .filter((ch) => isSendableChannel(ch))
    .filter((ch) => {
      const perms = ch.permissionsFor(me);
      return (
        perms?.has(PermissionFlagsBits.ViewChannel) &&
        perms?.has(PermissionFlagsBits.SendMessages)
      );
    })
    .sort((a, b) => {
      const catA = a.parent?.name ?? "";
      const catB = b.parent?.name ?? "";
      if (catA !== catB) return catA.localeCompare(catB, "pt-BR");
      return a.name.localeCompare(b.name, "pt-BR");
    });
}

function channelOptionLabel(channel) {
  const prefix = channel.parent ? `${channel.parent.name} › ` : "";
  const icon =
    channel.type === ChannelType.GuildAnnouncement
      ? "📢 "
      : channel.type === ChannelType.GuildForum
        ? "📋 "
        : "💬 ";
  return `${icon}${prefix}#${channel.name}`.slice(0, 100);
}

function buildChannelOptions(channels, page, selectedId) {
  const start = page * PER_PAGE;
  const slice = channels.slice(start, start + PER_PAGE);

  if (!slice.length) {
    return [{ label: "Nenhum canal disponível", value: "none" }];
  }

  return slice.map((c) => ({
    label: channelOptionLabel(c),
    value: c.id,
    description: `ID: ${c.id}`.slice(0, 100),
    default: c.id === selectedId
  }));
}

function getChannelPageInfo(total, page) {
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  return { totalPages, page: safePage, perPage: PER_PAGE };
}

module.exports = {
  PER_PAGE,
  fetchSendableChannels,
  buildChannelOptions,
  getChannelPageInfo,
  channelOptionLabel
};
