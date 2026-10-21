'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { requireAdmin } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status-sync')
    .setDescription('Trigger an immediate synchronization with external status APIs'),

  async execute(interaction, context) {
    const authorized = await requireAdmin(interaction);
    if (!authorized) return;

    await interaction.deferReply({ ephemeral: true });

    const { statusService, panelService, auditService, client } = context;

    try {
      const result = await statusService.syncProviders();

      auditService.log(interaction.user.id, 'MANUAL_SYNC_TRIGGERED', null, result);

      panelService.refreshAllPanels(client).catch(() => {});

      const primaryMsg = result.primary.success
        ? `🟢 Success (${result.primary.count} records)`
        : `🔴 Error: ${result.primary.error}`;

      const secondaryMsg = result.secondary.success
        ? `🟢 Success (${result.secondary.count} records)`
        : `🔴 Error: ${result.secondary.error}`;

      await interaction.editReply({
        content: `✅ **API Synchronization Finished**:\n` +
          `• **Primary API:** ${primaryMsg}\n` +
          `• **Secondary API:** ${secondaryMsg}\n` +
          `• **Snapshots Saved:** \`${result.snapshotsSaved}\`\n` +
          `*All active Discord status panels have been updated.*`
      });
    } catch (err) {
      await interaction.editReply({
        content: `❌ Synchronization failed: \`${err.message}\``
      });
    }
  }
};
