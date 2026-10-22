'use strict';

const { ActivityType, REST, Routes } = require('discord.js');
const logger = require('../utils/logger');
const { commandsList } = require('../commands');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client, { token }) {
    logger.info(`Role Bot ready! Logged in as ${client.user.tag} (ID: ${client.user.id})`);

    client.user.setPresence({
      activities: [
        {
          name: 'รับยศอัตโนมัติ | /role-help',
          type: ActivityType.Watching
        }
      ],
      status: 'online'
    });

    // Auto-deploy slash commands to joined guilds immediately
    try {
      const rest = new REST({ version: '10' }).setToken(token);
      const commandsJson = commandsList.map(cmd => cmd.data.toJSON());
      const guilds = await client.guilds.fetch();

      for (const [guildId, oAuth2Guild] of guilds) {
        try {
          await rest.put(
            Routes.applicationGuildCommands(client.user.id, guildId),
            { body: commandsJson }
          );
          logger.info(`Deployed role slash commands to Guild: "${oAuth2Guild.name}" (${guildId})`);
        } catch (err) {
          logger.warn(`Could not deploy to guild ${guildId}: ${err.message}`);
        }
      }
    } catch (deployErr) {
      logger.warn('Failed deploying guild commands on ready:', deployErr.message);
    }
  }
};
