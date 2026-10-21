'use strict';

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status-refresh')
    .setDescription('Manually trigger an immediate refresh of the published status panel'),

  async execute(interaction, context) {
    await interaction.deferReply({ ephemeral: true });
    const { panelService, client } = context;

    try {
      await panelService.refreshAllPanels(client);
      await interaction.editReply({
        content: '✅ All published status panels have been successfully refreshed with latest data.'
      });
    } catch (err) {
      await interaction.editReply({
        content: `❌ Failed to refresh status panel: \`${err.message}\``
      });
    }
  }
};
