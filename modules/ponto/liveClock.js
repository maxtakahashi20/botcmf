const { buildPanelEmbed } = require("./embeds.js");
const { buildPanelButtons } = require("../painel/buttons.js");
const { getPontoConfig } = require("./service.js");

const activeClocks = new Map();

function stopLiveClock(userId) {
  const entry = activeClocks.get(userId);
  if (!entry) return;
  clearInterval(entry.interval);
  activeClocks.delete(userId);
}

async function startLiveClock(interaction, client, session) {
  if (!session || !["ACTIVE", "PAUSED"].includes(session.status)) return;

  const userId = interaction.user.id;
  stopLiveClock(userId);

  const ponto = getPontoConfig(client.config);
  const channelName = ponto.operationalVoiceChannelName || "Operações RP";
  const userTag = interaction.user.tag;

  const tick = async () => {
    const current = await client.db.getActiveSession(userId);
    if (!current || current.id !== session.id) {
      stopLiveClock(userId);
      return;
    }

    const now = Date.now();
    const embed = buildPanelEmbed(current, channelName, userTag, now);
    const components = buildPanelButtons(current);

    try {
      await interaction.editReply({ embeds: [embed], components });
    } catch {
      stopLiveClock(userId);
    }
  };

  await tick();
  const interval = setInterval(tick, 1000);
  activeClocks.set(userId, { interval, interaction });
}

module.exports = { startLiveClock, stopLiveClock };
