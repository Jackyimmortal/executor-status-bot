'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { STATUS_EMOJIS } = require('../../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('executor-search')
    .setDescription('Search for executors by keyword or partial name')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('Search keyword')
        .setRequired(true)
    ),

  async execute(interaction, context) {
    const { executorRepo, statusService } = context;
    const query = interaction.options.getString('query');

    const matches = executorRepo.search(query);

    if (matches.length === 0) {
      return interaction.reply({
        content: `🔍 No executors found matching **"${query}"**. Try \`/executor-list\` to view all registered executors.`,
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`🔍 Search Results: "${query}"`)
      .setDescription(`Found **${matches.length}** matching executor(s):`)
      .setTimestamp();

    for (const match of matches) {
      const resolved = statusService.getExecutorResolvedStatus(match.canonical_name);
      const platformsStr = (resolved?.platforms || []).map(p => {
        const emoji = STATUS_EMOJIS[p.status] || '⚪';
        return `${emoji} ${p.platform}: \`${p.status}\``;
      }).join(' | ');

      embed.addFields({
        name: `**${match.display_name}** (\`${match.canonical_name}\`)`,
        value: platformsStr || 'No platform data available',
        inline: false
      });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
