'use strict';

require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { commandsList } = require('../src/commands');
const { config, validateConfig } = require('../src/config/config');
const logger = require('../src/utils/logger');

async function deployCommands() {
  const validation = validateConfig(true);
  if (!validation.valid) {
    logger.error('Cannot deploy commands: Configuration missing required Discord values:');
    for (const err of validation.errors) {
      logger.error('  - ' + err);
    }
    process.exit(1);
  }

  const token = config.discord.token;
  const clientId = config.discord.clientId;
  const guildId = config.discord.guildId;

  const commandsJson = commandsList.map(cmd => cmd.data.toJSON());
  logger.info(`Preparing to deploy ${commandsJson.length} slash commands...`);

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    if (guildId) {
      logger.info(`Deploying commands to Guild ID: ${guildId} (Instant propagation)`);
      const data = await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commandsJson }
      );
      logger.info(`Successfully registered ${data.length} guild slash commands.`);
    } else {
      logger.info('Deploying commands Globally (May take up to 1 hour to propagate across Discord)');
      const data = await rest.put(
        Routes.applicationCommands(clientId),
        { body: commandsJson }
      );
      logger.info(`Successfully registered ${data.length} global slash commands.`);
    }
  } catch (err) {
    logger.error('Failed to deploy slash commands:', err.stack || err.message);
    process.exit(1);
  }
}

deployCommands();
