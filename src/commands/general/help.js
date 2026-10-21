'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Display all available bot commands and usage guidelines'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📖 Executor Status Bot — Command Reference')
      .setDescription('Track Roblox executor updates, detection statuses, UNC scores, and platform compatibility.')
      .addFields(
        {
          name: '🌐 General Commands',
          value: [
            '`/help` — Show this command reference.',
            '`/executor-list` — List all registered executors.',
            '`/executor-info <name>` — Detailed executor version, UNC, and status.',
            '`/executor-search <query>` — Search executors by keyword.',
            '`/executor-platform <platform>` — Filter executors by OS platform.',
            '`/status-health` — Real-time health metrics (API, DB, Discord).',
            '`/api-check` — Verify presence of requested executors in external APIs.',
            '`/status-refresh` — Force a refresh of the public status panel.',
            '`/status-panel [channel]` — Create or reconnect the persistent status panel.'
          ].join('\n')
        },
        {
          name: '🛡️ Administrative Commands',
          value: [
            '`/executor-add <name> <display>` — Register a new executor.',
            '`/executor-edit <name> <display>` — Update executor display name.',
            '`/executor-remove <name>` — Remove an executor with confirmation.',
            '`/executor-status <options...>` — Set manual admin override status.',
            '`/status-source <API_FIRST|MANUAL_FIRST>` — Change data precedence.',
            '`/status-provider` — View API provider status, latencies, and health.',
            '`/status-conflicts` — View disagreements between API and manual records.',
            '`/status-sync` — Trigger immediate synchronization with APIs.',
            '`/status-config` — View non-sensitive bot runtime configuration.'
          ].join('\n')
        }
      )
      .setFooter({ text: 'Executor Status Bot v1.0.0 • Production Ready' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
