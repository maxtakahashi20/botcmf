const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require("discord.js");
const { assertAllowed } = require("../utils/permissions");
const {
  findOm,
  findGraduacao,
  buildNickname,
  getRoleIdsForGraduacao,
  parseRequestMeta,
  buildRequestFooter,
  gradSelectOptions,
  omSelectOptions,
  NICKNAME_MAX
} = require("../utils/setApply");

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function safeReply(interaction, options) {
  if (interaction.deferred || interaction.replied) {
    return interaction.followUp(options).catch(() => {});
  }
  return interaction.reply(options).catch(() => {});
}

async function addRolesToMember(member, roleIds, guild, botMember, changes) {
  if (!roleIds.length) {
    changes.push("- Nenhum cargo configurado para esta graduação.");
    return;
  }

  const resolved = await Promise.all(roleIds.map((id) => guild.roles.fetch(id).catch(() => null)));
  const roles = resolved.filter(Boolean);
  const missing = roleIds.filter((id) => !roles.some((r) => r.id === id));

  const notEditable = roles.filter((r) => !r.editable);
  const addable = roles.filter((r) => r.editable);

  if (missing.length) {
    changes.push(`- Cargo(s) não encontrado(s): ${missing.map((id) => "`" + id + "`").join(", ")}`);
  }
  if (notEditable.length) {
    const details = notEditable
      .map((r) => `@${r.name} (managed=${r.managed}, pos=${r.position})`)
      .join(", ");
    changes.push(
      `- Cargo(s) bloqueado(s) p/ bot. Bot pos=${botMember.roles.highest.position}. ${details}`
    );
  }
  if (!addable.length) {
    changes.push("- Nenhum cargo pôde ser adicionado (todos não editáveis para o bot).");
    return;
  }

  const ids = addable.map((r) => r.id);
  try {
    await member.roles.add(ids, "Exército Brasileiro: aprovação de SET");
    changes.push(`- ${ids.length} cargo(s) adicionado(s): ${addable.map((r) => "@" + r.name).join(", ")}`);
  } catch (e) {
    if (e?.code === 50013) {
      changes.push(
        "- Missing Permissions ao adicionar cargos. Verifique hierarquia e permissão 'Gerenciar Cargos'."
      );
    } else {
      throw e;
    }
  }
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handleSlashCommand(client, interaction) {
  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) return;

  try {
    assertAllowed(interaction, client.config);
    await cmd.execute(client, interaction);
  } catch (err) {
    if (err?.code === "FORBIDDEN") {
      return safeReply(interaction, {
        content: "🚫 Você não tem permissão para usar este comando.",
        ephemeral: true
      });
    }
    console.error("[SLASH]", err);
    return safeReply(interaction, {
      content: "❌ Ocorreu um erro ao executar o comando.",
      ephemeral: true
    });
  }
}

async function handleButton(client, interaction) {
  const { customId } = interaction;

  if (customId === "solicitar_set") {
    const omMenu = new StringSelectMenuBuilder()
      .setCustomId("select_om")
      .setPlaceholder("Selecione a OM")
      .addOptions(omSelectOptions(client.config));

    const row = new ActionRowBuilder().addComponents(omMenu);

    return interaction.reply({
      content: "🏛️ **Passo 1/3** — Selecione a Organização Militar (OM):",
      components: [row],
      ephemeral: true
    });
  }

  if (customId.startsWith("aprovar_") || customId.startsWith("reprovar_")) {
    const isAprovado = customId.startsWith("aprovar_");
    const userId = customId.replace(/^(aprovar_|reprovar_)/, "");

    try {
      assertAllowed(interaction, client.config);
    } catch {
      return interaction.reply({
        content: "🚫 Você não tem permissão para realizar esta ação.",
        ephemeral: true
      });
    }

    await interaction.deferUpdate();

    const responsible = interaction.user;
    const originalEmbed = interaction.message.embeds[0];

    const statusLabel = isAprovado ? "✅ APROVADO" : "❌ REPROVADO";
    const statusColor = isAprovado ? 0x57f287 : 0xed4245;

    const updatedEmbed = EmbedBuilder.from(originalEmbed)
      .setColor(statusColor)
      .setFooter({
        text: `${statusLabel} por ${responsible.username} • ${new Date().toLocaleString("pt-BR")}`
      });

    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("_noop_aprovar")
        .setLabel("Aprovar")
        .setStyle(ButtonStyle.Success)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId("_noop_reprovar")
        .setLabel("Reprovar")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(true)
    );

    await interaction.message.edit({ embeds: [updatedEmbed], components: [disabledRow] });

    const changes = [];

    if (isAprovado) {
      try {
        const member = await interaction.guild.members.fetch(userId);
        const botMember = interaction.guild.members.me ?? (await interaction.guild.members.fetchMe());

        const nomeField = originalEmbed.fields?.find((f) => f.name.includes("Nome RP"));
        const nomeRP = nomeField?.value?.trim() || member.displayName;

        const { omId, gradId } = parseRequestMeta(originalEmbed);
        const om = findOm(client.config, omId);
        const grad = findGraduacao(client.config, gradId);

        if (!om || !grad) {
          changes.push("- OM ou graduação não identificada no embed. Cargos/apelido não aplicados.");
        } else {
          const roleIds = getRoleIdsForGraduacao(client.config, grad);
          await addRolesToMember(member, roleIds, interaction.guild, botMember, changes);

          const nickname = buildNickname(om, grad, nomeRP);
          const fullNickname = `${om.prefix} ${grad.abbr} | ${nomeRP.trim()}`;
          try {
            await member.setNickname(nickname, "Exército Brasileiro: aprovação de SET (apelido)");
            changes.push(`- Apelido: ${nickname}`);
            if (fullNickname.length > NICKNAME_MAX) {
              changes.push(`- ⚠️ Apelido truncado (limite Discord: ${NICKNAME_MAX} caracteres).`);
            }
          } catch (e) {
            if (e?.code === 50013) {
              changes.push(
                "- Missing Permissions ao alterar apelido. Verifique permissão 'Gerenciar Apelidos' e hierarquia."
              );
            } else {
              changes.push("- Apelido não alterado (sem permissão/hierarquia)");
            }
          }
        }
      } catch (err) {
        console.error("[APROVAR]", err);
        changes.push("- Erro ao aplicar cargos/apelido");
      }
    }

    let dmEnviada = false;
    try {
      const candidato = await client.users.fetch(userId);
      const dmMsg = isAprovado
        ? "✅ **Sua solicitação de SET no Exército Brasileiro foi APROVADA!**\n\nParabéns! Em breve você receberá as orientações necessárias."
        : "❌ **Sua solicitação de SET no Exército Brasileiro foi REPROVADA.**\n\nNão desanime! Você poderá tentar novamente futuramente.";
      await candidato.send(dmMsg);
      dmEnviada = true;
    } catch {
      dmEnviada = false;
    }

    const changesText = changes.length ? `\n${changes.join("\n")}` : "";
    await interaction.followUp({
      content:
        `${statusLabel} para <@${userId}>.${changesText}\n` +
        (dmEnviada ? "📨 DM enviada ao candidato." : "⚠️ Não consegui enviar DM (usuário com DMs fechadas)."),
      ephemeral: true
    });

    return;
  }
}

async function handleSelectMenu(client, interaction) {
  const { customId, values } = interaction;

  if (customId === "select_om") {
    const omId = values[0];
    const om = findOm(client.config, omId);
    if (!om) {
      return interaction.update({ content: "❌ OM inválida.", components: [] });
    }

    const gradMenu = new StringSelectMenuBuilder()
      .setCustomId(`select_grad_${omId}`)
      .setPlaceholder("Selecione a graduação")
      .addOptions(gradSelectOptions(client.config));

    const row = new ActionRowBuilder().addComponents(gradMenu);

    return interaction.update({
      content: `🏛️ **OM:** ${om.label}\n🎖️ **Passo 2/3** — Selecione a graduação:`,
      components: [row]
    });
  }

  if (customId.startsWith("select_grad_")) {
    const omId = customId.replace("select_grad_", "");
    const gradId = values[0];
    const om = findOm(client.config, omId);
    const grad = findGraduacao(client.config, gradId);

    if (!om || !grad) {
      return interaction.update({ content: "❌ Graduação inválida.", components: [] });
    }

    const modal = new ModalBuilder()
      .setCustomId(`modal_set_${omId}::${gradId}`)
      .setTitle("Solicitação de SET — EB");

    const nomeInput = new TextInputBuilder()
      .setCustomId("campo_nome")
      .setLabel("Nome completo (RP)")
      .setPlaceholder("Ex: João da Silva")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(80);

    const idadeInput = new TextInputBuilder()
      .setCustomId("campo_idade")
      .setLabel("Idade")
      .setPlaceholder("Ex: 22")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(3);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nomeInput),
      new ActionRowBuilder().addComponents(idadeInput)
    );

    return interaction.showModal(modal);
  }
}

async function handleModalSubmit(client, interaction) {
  if (!interaction.customId.startsWith("modal_set_")) return;

  await interaction.deferReply({ ephemeral: true });

  const payload = interaction.customId.replace("modal_set_", "");
  const sep = payload.indexOf("::");
  if (sep === -1) {
    return interaction.editReply("❌ Formulário inválido. Tente novamente.");
  }
  const omId = payload.slice(0, sep);
  const gradId = payload.slice(sep + 2);

  const om = findOm(client.config, omId);
  const grad = findGraduacao(client.config, gradId);

  if (!om || !grad) {
    return interaction.editReply("❌ OM ou graduação inválida. Tente novamente.");
  }

  const nomeRP = interaction.fields.getTextInputValue("campo_nome");
  const idade = interaction.fields.getTextInputValue("campo_idade");
  const candidato = interaction.user;
  const apelidoPrevisto = buildNickname(om, grad, nomeRP);

  const requestsChannelId = client.config.requestsChannelId;
  if (!requestsChannelId) {
    return interaction.editReply("❌ `requestsChannelId` não configurado em `config/config.json`.");
  }

  const requestsChannel = await interaction.guild.channels.fetch(requestsChannelId).catch(() => null);
  if (!requestsChannel) {
    return interaction.editReply("❌ Canal de solicitações não encontrado.");
  }

  const embed = new EmbedBuilder()
    .setTitle("📋 Nova Solicitação de SET")
    .setColor(0xfee75c)
    .setThumbnail(candidato.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: "👤 Usuário", value: `<@${candidato.id}> (\`${candidato.username}\`)`, inline: false },
      { name: "🏛️ OM", value: om.label, inline: false },
      { name: "🎖️ Graduação", value: grad.label, inline: true },
      { name: "🪪 Nome RP", value: nomeRP, inline: true },
      { name: "🎂 Idade", value: idade, inline: true },
      { name: "📛 Apelido previsto", value: `\`${apelidoPrevisto}\``, inline: false }
    )
    .setFooter({ text: buildRequestFooter(candidato.id, omId, gradId) })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`aprovar_${candidato.id}`)
      .setLabel("Aprovar")
      .setStyle(ButtonStyle.Success)
      .setEmoji("✅"),
    new ButtonBuilder()
      .setCustomId(`reprovar_${candidato.id}`)
      .setLabel("Reprovar")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("❌")
  );

  await requestsChannel.send({ embeds: [embed], components: [row] });

  await interaction.editReply(
    `✅ Solicitação enviada!\n\n` +
      `**OM:** ${om.label}\n` +
      `**Graduação:** ${grad.label}\n` +
      `**Apelido previsto:** \`${apelidoPrevisto}\`\n\n` +
      "Aguarde a análise da equipe — você será avisado por DM."
  );
}

// ─── Entry point ──────────────────────────────────────────────────────────────

module.exports = {
  name: "interactionCreate",
  once: false,
  async execute(client, interaction) {
    try {
      if (interaction.isChatInputCommand()) return handleSlashCommand(client, interaction);
      if (interaction.isButton()) return handleButton(client, interaction);
      if (interaction.isStringSelectMenu()) return handleSelectMenu(client, interaction);
      if (interaction.isModalSubmit()) return handleModalSubmit(client, interaction);
    } catch (err) {
      console.error("[interactionCreate]", err);
    }
  }
};
