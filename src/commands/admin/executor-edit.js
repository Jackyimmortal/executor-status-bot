'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { requireAdmin } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('executor-edit')
    .setDescription('Edit an existing executor display name')
    .addStringOption(option =>
      option.setName('executor')
        .setDescription('Name or canonical ID of the executor to edit')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('display_name')
        .setDescription('New display name')
        .setRequired(true)
    ),

  async execute(interaction, context) {
    const authorized = await requireAdmin(interaction);
    if (!authorized) return;

    const { executorRepo, auditService, panelService, client } = context;
    const target = interaction.options.getString('executor');
    const newDisplayName = interaction.options.getString('display_name').trim();

    const existing = executorRepo.findByNameOrAlias(target);
    if (!existing) {
      return interaction.reply({
        content: `❌ Could not find executor matching **"${target}"**.`,
        ephemeral: true
      });
    }

    try {
      const oldName = existing.display_name;
      const updated = executorRepo.update(existing.id, newDisplayName);

      auditService.log(interaction.user.id, 'EXECUTOR_EDIT', existing.id, {
        oldDisplayName: oldName,
        newDisplayName
      });

      panelService.refreshAllPanels(client).catch(() => {});

      await interaction.reply({
        content: `✅ Successfully renamed **${oldName}** to **${updated.display_name}**.`,
        ephemeral: true
      });
    } catch (err) {
      await interaction.reply({
        content: `❌ Failed to update executor: \`${err.message}\``,
        ephemeral: true
      });
    }
  }
};
