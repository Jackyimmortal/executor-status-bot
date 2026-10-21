'use strict';

const { getDatabase, closeDatabase } = require('../src/database/db');
const { runMigrations } = require('../src/database/migrations');
const logger = require('../src/utils/logger');

function run() {
  logger.info('Running database migrations...');
  try {
    const db = getDatabase();
    runMigrations(db);
    logger.info('Database migrations completed successfully.');
  } catch (err) {
    logger.error('Database migration failed:', err.stack || err.message);
    process.exit(1);
  } finally {
    closeDatabase();
  }
}

run();
