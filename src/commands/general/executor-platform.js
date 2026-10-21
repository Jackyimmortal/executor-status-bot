'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { PLATFORM } = require('../../utils/constants');
const { createStatusPanelEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('executor-platform')
    .setDescription('Filter executors by supported operating system platform')
    .addStringOption(option =>
      option.setName('platform')
        .setDescription('Target platform')
        .setRequired(true)
        .addChoices(
          { name: 'Windows', value: PLATFORM.WINDOWS },
          { name: 'Android', value: PLATFORM.ANDROID },
          { name: 'iOS', value: PLATFORM.IOS },
          { name: 'Other', value: PLATFORM.OTHER }
        )
    ),

  async execute(interaction, context) {
    const { statusService } = context;
    const platform = interaction.options.getString('platform');

    const items = statusService.getAllResolvedStatuses(platform);

    const { embed } = createStatusPanelEmbed(items, {
      page: 1,
      pageSize: 10,
      filter: platform
    });

    embed.setTitle(`📱 Platform Filter: ${platform}`);
    await interaction.reply({ embeds: [embed] });
  }
};
