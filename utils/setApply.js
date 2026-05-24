const NICKNAME_MAX = 32;

function findOm(config, omId) {
  return config.oms?.find((o) => o.id === omId) ?? null;
}

function findGraduacao(config, gradId) {
  return config.graduacoes?.find((g) => g.id === gradId) ?? null;
}

function buildNickname(om, grad, nome) {
  const raw = `${om.prefix} ${grad.abbr} | ${nome.trim()}`;
  if (raw.length <= NICKNAME_MAX) return raw;
  return raw.slice(0, NICKNAME_MAX);
}

function getRoleIdsForGraduacao(config, grad) {
  const ids = [grad.roleId];
  if (Array.isArray(grad.extraRoleIds)) ids.push(...grad.extraRoleIds);
  if (Array.isArray(config.globalExtraRoleIds)) ids.push(...config.globalExtraRoleIds);
  return [...new Set(ids)];
}

function parseRequestMeta(embed) {
  const footer = embed.footer?.text ?? "";
  const omMatch = footer.match(/om:([a-z0-9_]+)/i);
  const gradMatch = footer.match(/grad:([a-z0-9_]+)/i);
  return {
    omId: omMatch?.[1] ?? null,
    gradId: gradMatch?.[1] ?? null
  };
}

function buildRequestFooter(userId, omId, gradId) {
  return `ID: ${userId} • om:${omId} • grad:${gradId}`;
}

function gradSelectOptions(config) {
  return config.graduacoes.map((g) => ({
    label: g.label,
    value: g.id,
    description: `Apelido: ${g.abbr}`
  }));
}

function omSelectOptions(config) {
  return config.oms.map((o) => ({
    label: o.label.length > 100 ? o.label.slice(0, 97) + "..." : o.label,
    value: o.id,
    description: `Prefixo: ${o.prefix}`
  }));
}

module.exports = {
  NICKNAME_MAX,
  findOm,
  findGraduacao,
  buildNickname,
  getRoleIdsForGraduacao,
  parseRequestMeta,
  buildRequestFooter,
  gradSelectOptions,
  omSelectOptions
};
