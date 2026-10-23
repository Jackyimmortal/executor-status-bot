'use strict';

require('dotenv').config();
const http = require('http');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { getDatabase } = require('./database/db');
const { commandsCollection } = require('./commands');
const readyEvent = require('./events/ready');
const interactionCreateEvent = require('./events/interactionCreate');
const logger = require('./utils/logger');

const TOKEN = process.env.DISCORD_TOKEN;
const PORT = process.env.PORT || 3002;
const DATABASE_PATH = process.env.DATABASE_PATH || './data/tickets.sqlite';

if (!TOKEN) {
  logger.error('CRITICAL: DISCORD_TOKEN is missing in .env file!');
  process.exit(1);
}

// 1. Initialize Database
const db = getDatabase(DATABASE_PATH);

// 2. Initialize Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message]
});

// 3. Register Event Listeners
client.once('ready', () => readyEvent.execute(client, { token: TOKEN }));
client.on('interactionCreate', (interaction) =>
  interactionCreateEvent.execute(interaction, { client, db, commands: commandsCollection })
);

// 4. Lightweight Keep-Alive HTTP Server (for hosting / health checks)
const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'discord-ticket-bot',
      discordReady: client.isReady(),
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, '0.0.0.0', () => {
  logger.info(`Health check HTTP server running on port ${PORT}`);
});

// 5. Connect to Discord
logger.info('Logging in to Discord...');
client.login(TOKEN).catch((err) => {
  logger.error('Failed to log in to Discord:', err.message);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT. Shutting down cleanly...');
  client.destroy();
  server.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM. Shutting down cleanly...');
  client.destroy();
  server.close();
  process.exit(0);
});
