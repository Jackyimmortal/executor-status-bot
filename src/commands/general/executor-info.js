'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { createExecutorDetailEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('executor-info')
    .setDescription('Display detailed status and technical capabilities of an executor')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Name or alias of the executor (e.g. Solara, Delta, Xeno)')
        .setRequired(true)
    ),

  async execute(interaction, context) {
    const { statusService } = context;
    const name = interaction.options.getString('name');

    const resolved = statusService.getExecutorResolvedStatus(name);

    if (!resolved) {
      return interaction.reply({
        content: `❌ Executor **"${name}"** was not found in registered records. Use \`/executor-list\` to view available executors.`,
        ephemeral: true
      });
    }

    const embed = createExecutorDetailEmbed(resolved);
    await interaction.reply({ embeds: [embed] });
  }
};
