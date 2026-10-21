'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { STATUS_EMOJIS } = require('../../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('executor-list')
    .setDescription('Show all registered executors being monitored'),

  async execute(interaction, context) {
    const { statusService } = context;
    const items = statusService.getAllResolvedStatuses();

    // Group by executor
    const grouped = new Map();
    for (const item of items) {
      if (!grouped.has(item.displayName)) {
        grouped.set(item.displayName, []);
      }
      grouped.get(item.displayName).push(item);
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📋 Monitored Roblox Executors')
      .setDescription(`Currently tracking **${grouped.size}** distinct executors:`)
      .setTimestamp();

    const lines = [];
    for (const [name, platforms] of grouped.entries()) {
      const platformBadges = platforms.map(p => {
        const emoji = STATUS_EMOJIS[p.status] || '⚪';
        return `${emoji} ${p.platform}: \`${p.status}\``;
      }).join(' | ');

      lines.push(`• **${name}** — ${platformBadges}`);
    }

    embed.setDescription(lines.join('\n') || 'No executors registered.');
    embed.setFooter({ text: 'Use /executor-info <name> for comprehensive details.' });

    await interaction.reply({ embeds: [embed] });
  }
};
