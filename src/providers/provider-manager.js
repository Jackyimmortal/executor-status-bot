'use strict';

const ExecutorsOnlineProvider = require('./executors-online');
const RobloxExecutorsProvider = require('./roblox-executors');
const { PROVIDERS } = require('../utils/constants');
const logger = require('../utils/logger');

class ProviderManager {
  constructor(config, healthRepo, httpClient) {
    this.primary = new ExecutorsOnlineProvider(config.providers.primary, healthRepo, httpClient);
    this.secondary = new RobloxExecutorsProvider(config.providers.secondary, healthRepo, httpClient);
    this.providers = new Map([
      [PROVIDERS.PRIMARY, this.primary],
      [PROVIDERS.SECONDARY, this.secondary]
    ]);
  }

  getProvider(name) {
    return this.providers.get(name);
  }

  async fetchAll() {
    const results = {};
    const fetchPromises = [];

    for (const [name, provider] of this.providers.entries()) {
      fetchPromises.push(
        (async () => {
          try {
            const res = await provider.fetchExecutors();
            results[name] = res;
          } catch (err) {
            results[name] = {
              success: false,
              provider: name,
              error: err.message,
              records: []
            };
          }
        })()
      );
    }

    await Promise.all(fetchPromises);
    return results;
  }

  getAllHealth() {
    const health = {};
    for (const [name, provider] of this.providers.entries()) {
      health[name] = provider.getHealth();
    }
    return health;
  }
}

module.exports = ProviderManager;
