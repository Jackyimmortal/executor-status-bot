'use strict';

const { ActivityType } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client, context) {
    logger.info(`Discord client ready! Logged in as ${client.user.tag} (ID: ${client.user.id})`);

    // Set bot presence
    client.user.setPresence({
      activities: [
        {
          name: '11 Roblox Executors | /help',
          type: ActivityType.Watching
        }
      ],
      status: 'online'
    });

    // Deploy instant slash commands to all joined guilds so they appear immediately
    try {
      const { commandsList } = require('../commands');
      const { REST, Routes } = require('discord.js');
      const rest = new REST({ version: '10' }).setToken(context.config.discord.token);
      const commandsJson = commandsList.map(cmd => cmd.data.toJSON());

      const guilds = await client.guilds.fetch();
      for (const [guildId, oAuth2Guild] of guilds) {
        try {
          await rest.put(
            Routes.applicationGuildCommands(client.user.id, guildId),
            { body: commandsJson }
          );
          logger.info(`Instant slash commands deployed to Guild: "${oAuth2Guild.name}" (${guildId})`);
        } catch (guildErr) {
          logger.warn(`Could not deploy guild commands to ${guildId}: ${guildErr.message}`);
        }
      }
    } catch (deployErr) {
      logger.warn('Failed auto-deploying guild commands on ready:', deployErr.message);
    }

    // Start background polling service
    if (context.pollingService) {
      context.pollingService.start();
    }

    // Refresh any active panels on startup
    if (context.panelService) {
      context.panelService.refreshAllPanels(client).catch(err => {
        logger.warn('Failed initial panel refresh on ready:', err.message);
      });
    }
  }
};
