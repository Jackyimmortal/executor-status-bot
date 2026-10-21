'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { requireAdmin } = require('../../utils/permissions');
const { SOURCE_PRECEDENCE } = require('../../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status-source')
    .setDescription('Configure system-wide data source precedence')
    .addStringOption(option =>
      option.setName('precedence')
        .setDescription('Source precedence rule')
        .setRequired(true)
        .addChoices(
          { name: 'API First (Prioritize external APIs, fallback to manual)', value: SOURCE_PRECEDENCE.API_FIRST },
          { name: 'Manual First (Prioritize administrator overrides, fallback to APIs)', value: SOURCE_PRECEDENCE.MANUAL_FIRST }
        )
    ),

  async execute(interaction, context) {
    const authorized = await requireAdmin(interaction);
    if (!authorized) return;

    const { statusService, auditService, panelService, client } = context;
    const choice = interaction.options.getString('precedence');

    const updated = statusService.setSourcePrecedence(choice);

    auditService.log(interaction.user.id, 'PRECEDENCE_CHANGE', null, {
      newPrecedence: updated
    });

    panelService.refreshAllPanels(client).catch(() => {});

    await interaction.reply({
      content: `✅ Source precedence set to **\`${updated}\`**.\n` +
        (updated === SOURCE_PRECEDENCE.API_FIRST
          ? '• External API snapshots will be prioritized. Manual overrides will be used as fallback or flagged upon conflict.'
          : '• Administrator manual records will take precedence. Missing fields and executors will fallback to external API data.'),
      ephemeral: true
    });
  }
};
