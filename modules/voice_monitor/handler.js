const { cancelSessionAuto } = require("../ponto/service.js");
const { sendPontoLog, sendPontoDm, buildLeaveCallDm } = require("../logs/logger.js");
const { stopLiveClock } = require("../ponto/liveClock.js");

async function handleVoiceStateUpdate(client, oldState, newState) {
  const ponto = client.config.ponto;
  if (!ponto?.operationalVoiceChannelId) return;

  const opChannelId = ponto.operationalVoiceChannelId;
  const userId = newState.id || oldState.id;
  if (!userId || userId === client.user.id) return;

  const wasInOp = oldState.channelId === opChannelId;
  const isInOp = newState.channelId === opChannelId;

  if (wasInOp && !isInOp) {
    const session = await client.db.getActiveSession(userId);
    if (!session) return;

    const reason = "Saída da canaleta operacional";
    const canceled = await cancelSessionAuto(client.db, userId, reason);
    if (!canceled) return;

    stopLiveClock(userId);

    const user = await client.users.fetch(userId).catch(() => null);
    if (user) {
      await sendPontoDm(user, buildLeaveCallDm(canceled));
      await sendPontoLog(client, "CANCELAMENTO AUTO", user, canceled, reason);
    }
  }
}

module.exports = { handleVoiceStateUpdate };
