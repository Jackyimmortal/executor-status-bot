'use strict';

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { getDatabase } = require('./database/db');
const { commandsCollection } = require('./commands');
const readyEvent = require('./events/ready');
const interactionCreateEvent = require('./events/interactionCreate');
const logger = require('../../utils/logger');

let roleClient = null;

async function startRoleBot(token, dbPath = './data/roles.sqlite') {
  if (!token) return null;

  const db = getDatabase(dbPath);

  roleClient = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.GuildMember]
  });

  roleClient.once('ready', () => readyEvent.execute(roleClient, { token }));
  roleClient.on('interactionCreate', (interaction) =>
    interactionCreateEvent.execute(interaction, { db })
  );

  logger.info('Logging in Role Bot...');
  await roleClient.login(token);
  return roleClient;
}

function getRoleClient() {
  return roleClient;
}

module.exports = {
  startRoleBot,
  getRoleClient
};
