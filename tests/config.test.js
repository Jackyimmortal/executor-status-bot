'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { config, validateConfig } = require('../src/config/config');

test('Config: Default settings and types', () => {
  assert.ok(typeof config.polling.intervalSeconds === 'number');
  assert.ok(config.polling.intervalSeconds >= 30);
  assert.ok(typeof config.polling.staleThresholdSeconds === 'number');
  assert.ok(config.polling.staleThresholdSeconds >= 60);

  assert.ok(config.providers.primary.url.startsWith('http'));
  assert.ok(config.providers.secondary.url.startsWith('http'));
});

test('Config: Validation logic', () => {
  // Offline validation (requireDiscord = false)
  const offlineCheck = validateConfig(false);
  assert.equal(offlineCheck.valid, true);

  // When Discord is required but tokens are empty
  const savedToken = config.discord.token;
  config.discord.token = '';
  const onlineCheck = validateConfig(true);
  assert.equal(onlineCheck.valid, false);
  assert.ok(onlineCheck.errors.some(e => e.includes('DISCORD_TOKEN')));

  config.discord.token = savedToken;
});
