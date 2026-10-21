'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { requireAdmin } = require('../../utils/permissions');
const { config } = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status-config')
    .setDescription('Display active non-sensitive bot runtime configuration'),

  async execute(interaction, context) {
    const authorized = await requireAdmin(interaction);
    if (!authorized) return;

    const { statusService } = context;
    const currentPrecedence = statusService.getSourcePrecedence();

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('⚙️ Runtime Configuration')
      .setDescription('Active configuration parameters (sensitive tokens and keys redacted):')
      .addFields(
        {
          name: '🎯 Source Precedence',
          value: `Current Active: **\`${currentPrecedence}\`** (Default: \`${config.system.defaultPrecedence}\`)`,
          inline: true
        },
        {
          name: '⏱️ Polling & Freshness',
          value: `Poll Interval: \`${config.polling.intervalSeconds}s\`\nStale Threshold: \`${config.polling.staleThresholdSeconds}s\``,
          inline: true
        },
        {
          name: '💾 Storage',
          value: `Database: \`${config.database.path}\``,
          inline: true
        },
        {
          name: '🌐 Primary API Provider',
          value: `Enabled: \`${config.providers.primary.enabled}\`\nURL: \`${config.providers.primary.url}\`\nTimeout: \`${config.providers.primary.timeoutMs}ms\``,
          inline: false
        },
        {
          name: '🌐 Secondary API Provider',
          value: `Enabled: \`${config.providers.secondary.enabled}\`\nURL: \`${config.providers.secondary.url}\`\nTimeout: \`${config.providers.secondary.timeoutMs}ms\``,
          inline: false
        },
        {
          name: '🛡️ Admin Role ID',
          value: config.discord.adminRoleId ? `\`${config.discord.adminRoleId}\`` : '*Not configured (using Administrator permission)*',
          inline: false
        }
      )
      .setFooter({ text: 'Executor Status Bot • Secure Configuration' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
