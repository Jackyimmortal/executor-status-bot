'use strict';

const logger = require('../utils/logger');
const { commandsCollection } = require('../commands');

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, context) {
    // 1. Handle Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = commandsCollection.get(interaction.commandName);
      if (!command) {
        logger.warn(`No command handler found matching: ${interaction.commandName}`);
        return interaction.reply({
          content: `❌ Unknown command \`/${interaction.commandName}\`.`,
          ephemeral: true
        });
      }

      try {
        logger.info(`Command executed: /${interaction.commandName} by ${interaction.user.tag} (${interaction.user.id}) in guild ${interaction.guildId || 'DM'}`);
        await command.execute(interaction, context);
      } catch (err) {
        logger.error(`Error executing /${interaction.commandName}:`, err.stack || err.message);

        const errorMessage = {
          content: `❌ An unexpected error occurred while executing this command: \`${err.message}\``,
          ephemeral: true
        };

        if (interaction.deferred || interaction.replied) {
          await interaction.followUp(errorMessage).catch(() => {});
        } else {
          await interaction.reply(errorMessage).catch(() => {});
        }
      }
      return;
    }

    // 2. Handle Interactive Buttons (e.g. status panel filters, pagination, refresh)
    if (interaction.isButton()) {
      if (interaction.customId.startsWith('panel_')) {
        try {
          await context.panelService.handlePanelInteraction(interaction);
        } catch (err) {
          logger.error('Error handling panel button interaction:', err.stack || err.message);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content: '❌ Failed to process panel button action.',
              ephemeral: true
            }).catch(() => {});
          }
        }
      }
    }
  }
};
