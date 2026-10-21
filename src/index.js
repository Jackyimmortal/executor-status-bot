'use strict';

const ExecutorBot = require('./bot');
const logger = require('./utils/logger');

const bot = new ExecutorBot();

async function main() {
  try {
    await bot.start();
  } catch (err) {
    logger.error('Fatal initialization error:', err.stack || err.message);
  }
}

// Graceful shutdown handling
process.on('SIGINT', async () => {
  logger.info('Received SIGINT signal.');
  await bot.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM signal.');
  await bot.stop();
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err.stack || err.message);
});

main();
