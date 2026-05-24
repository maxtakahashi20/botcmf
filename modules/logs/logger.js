const { buildLogEmbed } = require("../ponto/embeds.js");
const { formatDuration, formatDateTime } = require("../ponto/time.js");

async function sendPontoLog(client, action, user, session, extra = "") {
  const channelId = client.config.ponto?.logsChannelId;
  if (!channelId) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) return;

  const userTag = user?.tag ?? user?.username ?? String(user);
  const embed = buildLogEmbed(action, userTag, session, extra);
  await channel.send({ embeds: [embed] }).catch(() => {});
}

async function sendPontoDm(user, message) {
  try {
    await user.send(message);
    return true;
  } catch {
    return false;
  }
}

/** DM apenas ao sair/desconectar da call operacional */
function buildLeaveCallDm(session) {
  const activeMs = session.total_time_ms ?? 0;
  const pausedMs = Number(session.paused_time_ms) || 0;
  const isCanceled = session.status === "CANCELED";

  const header = isCanceled
    ? "❌ **Ponto encerrado automaticamente**"
    : "🔴 **Ponto encerrado**";

  return [
    header,
    "",
    "Você saiu da canaleta operacional.",
    "",
    `🕐 **Tempo em serviço:** \`${formatDuration(activeMs)}\``,
    `⏸️ **Tempo pausado:** \`${formatDuration(pausedMs)}\``,
    "",
    `**Início:** ${formatDateTime(session.started_at)}`,
    `**Fim:** ${formatDateTime(session.ended_at)}`
  ].join("\n");
}

module.exports = { sendPontoLog, sendPontoDm, buildLeaveCallDm };
