'use strict';

require('dotenv').config();
const path = require('path');
const { SOURCE_PRECEDENCE } = require('../utils/constants');

function getInt(val, fallback) {
  const parsed = parseInt(val, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function getBool(val, fallback) {
  if (val === undefined || val === null || val === '') return fallback;
  return String(val).toLowerCase() === 'true' || val === '1';
}

const config = {
  discord: {
    token: process.env.DISCORD_TOKEN || '',
    clientId: process.env.CLIENT_ID || '',
    guildId: process.env.GUILD_ID || '',
    adminRoleId: process.env.ADMIN_ROLE_ID || '',
    statusChannelId: process.env.STATUS_CHANNEL_ID || ''
  },
  providers: {
    primary: {
      enabled: getBool(process.env.PRIMARY_API_ENABLED, true),
      url: process.env.PRIMARY_API_URL || process.env.STATUS_API_URL || 'https://executors.online/api/executors',
      key: process.env.PRIMARY_API_KEY || process.env.STATUS_API_KEY || '',
      timeoutMs: getInt(process.env.PRIMARY_API_TIMEOUT_MS || process.env.STATUS_API_TIMEOUT_MS, 10000)
    },
    secondary: {
      enabled: getBool(process.env.SECONDARY_API_ENABLED, true),
      url: process.env.SECONDARY_API_URL || 'https://robloxexecutors.com/api/v1/executors',
      key: process.env.SECONDARY_API_KEY || '',
      timeoutMs: getInt(process.env.SECONDARY_API_TIMEOUT_MS, 10000)
    }
  },
  polling: {
    intervalSeconds: Math.max(30, getInt(process.env.STATUS_POLL_INTERVAL_SECONDS, 300)),
    staleThresholdSeconds: Math.max(60, getInt(process.env.STALE_THRESHOLD_SECONDS, 1800))
  },
  database: {
    path: process.env.DATABASE_PATH || path.resolve(process.cwd(), 'data', 'executor_status.sqlite')
  },
  system: {
    defaultPrecedence: (process.env.DEFAULT_SOURCE_PRECEDENCE || SOURCE_PRECEDENCE.API_FIRST).toUpperCase() === SOURCE_PRECEDENCE.MANUAL_FIRST
      ? SOURCE_PRECEDENCE.MANUAL_FIRST
      : SOURCE_PRECEDENCE.API_FIRST,
    logLevel: process.env.LOG_LEVEL || 'info'
  }
};

function validateConfig(requireDiscord = false) {
  const errors = [];
  if (requireDiscord) {
    if (!config.discord.token) errors.push('DISCORD_TOKEN is required to connect to Discord.');
    if (!config.discord.clientId) errors.push('CLIENT_ID is required.');
  }

  if (config.providers.primary.enabled && !config.providers.primary.url) {
    errors.push('PRIMARY_API_URL is required when primary provider is enabled.');
  }
  if (config.providers.secondary.enabled && !config.providers.secondary.url) {
    errors.push('SECONDARY_API_URL is required when secondary provider is enabled.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  config,
  validateConfig
};
