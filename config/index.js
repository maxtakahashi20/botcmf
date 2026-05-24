const fs = require("node:fs");
const path = require("node:path");

function loadConfig() {
  const configPath = path.join(__dirname, "config.json");
  const raw = fs.readFileSync(configPath, "utf8");
  const cfg = JSON.parse(raw);

  if (!cfg.guildId) throw new Error("config.guildId ausente em config/config.json");
  if (!Array.isArray(cfg.allowedRoleIds)) throw new Error("config.allowedRoleIds deve ser um array");
  if (!cfg.panelChannelId) throw new Error("config.panelChannelId ausente em config/config.json");
  if (!cfg.requestsChannelId) throw new Error("config.requestsChannelId ausente em config/config.json");
  if (!Array.isArray(cfg.oms) || !cfg.oms.length) {
    throw new Error("config.oms deve ser um array não vazio em config/config.json");
  }
  if (!Array.isArray(cfg.graduacoes) || !cfg.graduacoes.length) {
    throw new Error("config.graduacoes deve ser um array não vazio em config/config.json");
  }

  for (const om of cfg.oms) {
    if (!om.id || !om.label || !om.prefix) {
      throw new Error("Cada OM precisa de id, label e prefix em config/config.json");
    }
  }

  for (const grad of cfg.graduacoes) {
    if (!grad.id || !grad.label || !grad.abbr || !grad.roleId) {
      throw new Error("Cada graduação precisa de id, label, abbr e roleId em config/config.json");
    }
  }

  if (!Array.isArray(cfg.globalExtraRoleIds)) cfg.globalExtraRoleIds = [];

  return cfg;
}

module.exports = { loadConfig };
