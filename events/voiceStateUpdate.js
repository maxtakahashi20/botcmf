const { handleVoiceStateUpdate } = require("../modules/voice_monitor/handler.js");

module.exports = {
  name: "voiceStateUpdate",
  once: false,
  execute(client, oldState, newState) {
    handleVoiceStateUpdate(client, oldState, newState).catch((err) => {
      console.error("[voiceStateUpdate]", err);
    });
  }
};
