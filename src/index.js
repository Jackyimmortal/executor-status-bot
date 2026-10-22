'use strict';

require('dotenv').config();
const ExecutorBot = require('./bot');
const logger = require('./utils/logger');
const { startRoleBot, getRoleClient } = require('./modules/role-bot');
const { startTicketBot, getTicketClient } = require('./modules/ticket-bot');

const bot = new ExecutorBot();

async function main() {
  try {
    // 1. Start Primary Executor Status Bot
    await bot.start();

    // 2. Start Sub-Bots if Tokens Provided (All-in-One 24/7 Hosting)
    if (process.env.ROLE_BOT_TOKEN) {
      logger.info('ROLE_BOT_TOKEN detected. Starting Role Bot inside multi-process container...');
      try {
        await startRoleBot(process.env.ROLE_BOT_TOKEN);
      } catch (roleErr) {
        logger.error('Failed to start Role Bot:', roleErr.message);
      }
    }

    if (process.env.TICKET_BOT_TOKEN) {
      logger.info('TICKET_BOT_TOKEN detected. Starting Ticket Bot inside multi-process container...');
      try {
        await startTicketBot(process.env.TICKET_BOT_TOKEN);
      } catch (ticketErr) {
        logger.error('Failed to start Ticket Bot:', ticketErr.message);
      }
    }
  } catch (err) {
    logger.error('Fatal initialization error:', err.stack || err.message);
  }
}

// Graceful shutdown handling
process.on('SIGINT', async () => {
  logger.info('Received SIGINT signal.');
  await bot.stop();
  const roleClient = getRoleClient();
  if (roleClient) { try { await roleClient.destroy(); } catch {} }
  const ticketClient = getTicketClient();
  if (ticketClient) { try { await ticketClient.destroy(); } catch {} }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM signal.');
  await bot.stop();
  const roleClient = getRoleClient();
  if (roleClient) { try { await roleClient.destroy(); } catch {} }
  const ticketClient = getTicketClient();
  if (ticketClient) { try { await ticketClient.destroy(); } catch {} }
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err.stack || err.message);
});

main();
