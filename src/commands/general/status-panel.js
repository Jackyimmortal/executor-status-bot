'use strict';

const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { requireAdmin } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status-panel')
    .setDescription('Deploy or reconnect the live interactive status panel in a channel')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to deploy the panel into (defaults to current channel)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute(interaction, context) {
    // Panel deployment alters channel messages, so require admin
    const authorized = await requireAdmin(interaction);
    if (!authorized) return;

    await interaction.deferReply({ ephemeral: true });

    const { panelService } = context;
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

    if (!targetChannel || !targetChannel.isTextBased()) {
      return interaction.editReply({
        content: '❌ Invalid channel. Please choose a standard text channel.'
      });
    }

    try {
      const result = await panelService.createOrReconnectPanel(targetChannel, interaction.guildId);
      const actionText = result.reconnected ? 'reconnected and updated' : 'created';
      await interaction.editReply({
        content: `✅ Successfully ${actionText} the status panel in ${targetChannel} (Message ID: \`${result.message.id}\`).`
      });
    } catch (err) {
      await interaction.editReply({
        content: `❌ Error deploying status panel: \`${err.message}\``
      });
    }
  }
};
