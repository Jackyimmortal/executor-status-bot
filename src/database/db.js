'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const logger = require('../utils/logger');
const { config } = require('../config/config');

let instance = null;

class Database {
  constructor(dbPath = null) {
    this.dbPath = dbPath || config.database.path;
    this.db = null;
    this._init();
  }

  _init() {
    if (this.dbPath !== ':memory:') {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    try {
      this.db = new DatabaseSync(this.dbPath);
      // SQLite pragmas for performance and data integrity
      this.db.exec('PRAGMA foreign_keys = ON;');
      if (this.dbPath !== ':memory:') {
        this.db.exec('PRAGMA journal_mode = WAL;');
        this.db.exec('PRAGMA synchronous = NORMAL;');
      }
      this.db.exec('PRAGMA busy_timeout = 5000;');
      logger.info(`SQLite database connected at: ${this.dbPath}`);
    } catch (err) {
      logger.error(`Failed to connect to SQLite database at ${this.dbPath}:`, err.message);
      throw err;
    }
  }

  exec(sql) {
    return this.db.exec(sql);
  }

  prepare(sql) {
    return this.db.prepare(sql);
  }

  close() {
    if (this.db) {
      try {
        this.db.close();
        logger.info('Database connection closed.');
      } catch (err) {
        logger.error('Error closing database:', err.message);
      }
      this.db = null;
    }
  }
}

function getDatabase(customPath = null) {
  if (customPath && customPath === ':memory:') {
    return new Database(':memory:');
  }
  if (!instance || (customPath && instance.dbPath !== customPath)) {
    instance = new Database(customPath);
  }
  return instance;
}

function closeDatabase() {
  if (instance) {
    instance.close();
    instance = null;
  }
}

module.exports = {
  Database,
  getDatabase,
  closeDatabase
};
