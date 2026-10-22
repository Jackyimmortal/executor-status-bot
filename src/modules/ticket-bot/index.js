'use strict';

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { getDatabase } = require('./database/db');
const { commandsCollection } = require('./commands');
const readyEvent = require('./events/ready');
const interactionCreateEvent = require('./events/interactionCreate');
const logger = require('../../utils/logger');

let ticketClient = null;

async function startTicketBot(token, dbPath = './data/tickets.sqlite') {
  if (!token) return null;

  const db = getDatabase(dbPath);

  ticketClient = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message]
  });

  ticketClient.once('ready', () => readyEvent.execute(ticketClient, { token }));
  ticketClient.on('interactionCreate', (interaction) =>
    interactionCreateEvent.execute(interaction, { client: ticketClient, db, commands: commandsCollection })
  );

  logger.info('Logging in Ticket Bot...');
  await ticketClient.login(token);
  return ticketClient;
}

function getTicketClient() {
  return ticketClient;
}

module.exports = {
  startTicketBot,
  getTicketClient
};
