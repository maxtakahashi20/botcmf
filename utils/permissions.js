function memberHasAnyRole(member, roleIds) {
  if (!member || !member.roles) return false;
  return roleIds.some((id) => member.roles.cache.has(id));
}

function assertAllowed(interaction, config) {
  const allowedRoleIds = config.allowedRoleIds || [];
  if (!memberHasAnyRole(interaction.member, allowedRoleIds)) {
    const err = new Error("FORBIDDEN");
    err.code = "FORBIDDEN";
    throw err;
  }
}

function assertPontoAdmin(interaction, config) {
  const adminRoleIds = config.ponto?.adminRoleIds ?? [];
  if (!adminRoleIds.length || !memberHasAnyRole(interaction.member, adminRoleIds)) {
    const err = new Error("FORBIDDEN");
    err.code = "FORBIDDEN";
    throw err;
  }
}

module.exports = { memberHasAnyRole, assertAllowed, assertPontoAdmin };

