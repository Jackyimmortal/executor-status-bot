'use strict';

const logger = require('../utils/logger');

class PollingService {
  constructor(statusService, panelService, clientProvider, options = {}) {
    this.statusService = statusService;
    this.panelService = panelService;
    this.getClient = typeof clientProvider === 'function' ? clientProvider : () => clientProvider;
    this.intervalSeconds = options.intervalSeconds || 300;
    this.timer = null;
    this.isPolling = false;
    this.lastPollTime = null;
    this.pollCount = 0;
  }

  start() {
    if (this.timer) {
      logger.warn('PollingService is already running.');
      return;
    }

    logger.info(`Starting PollingService with interval: ${this.intervalSeconds} seconds`);
    // Run an initial poll shortly after startup (e.g. 5 seconds)
    setTimeout(() => {
      this.poll().catch(err => logger.error('Error during initial poll:', err.message));
    }, 5000);

    this.timer = setInterval(() => {
      this.poll().catch(err => logger.error('Error during scheduled poll:', err.message));
    }, this.intervalSeconds * 1000);
  }

  async poll() {
    if (this.isPolling) {
      logger.warn('Skipping poll cycle: previous poll job is still in progress.');
      return;
    }

    this.isPolling = true;
    const startTime = Date.now();
    logger.info(`Polling cycle #${this.pollCount + 1} started.`);

    try {
      const syncResult = await this.statusService.syncProviders();
      this.lastPollTime = new Date().toISOString();
      this.pollCount++;

      // If snapshots were updated, refresh all Discord panels
      const client = this.getClient();
      if (client && client.isReady() && this.panelService) {
        await this.panelService.refreshAllPanels(client);
      }

      const elapsed = Date.now() - startTime;
      logger.info(`Polling cycle #${this.pollCount} finished in ${elapsed}ms. Snapshots saved: ${syncResult.snapshotsSaved}`);
    } catch (err) {
      logger.error('Unhandled error during poll cycle:', err.message);
    } finally {
      this.isPolling = false;
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('PollingService stopped.');
    }
  }
}

module.exports = PollingService;
