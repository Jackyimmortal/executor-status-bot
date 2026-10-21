'use strict';

const http = require('node:http');
const { Client, GatewayIntentBits } = require('discord.js');
const { config, validateConfig } = require('./config/config');
const logger = require('./utils/logger');
const { getDatabase, closeDatabase } = require('./database/db');
const { runMigrations } = require('./database/migrations');

// Repositories
const ExecutorRepository = require('./database/repositories/executor-repo');
const SnapshotRepository = require('./database/repositories/snapshot-repo');
const ManualRepository = require('./database/repositories/manual-repo');
const SettingsRepository = require('./database/repositories/settings-repo');
const HealthRepository = require('./database/repositories/health-repo');
const PanelRepository = require('./database/repositories/panel-repo');
const AuditRepository = require('./database/repositories/audit-repo');

// Providers & Services
const ProviderManager = require('./providers/provider-manager');
const StatusService = require('./services/status-service');
const PanelService = require('./services/panel-service');
const PollingService = require('./services/polling-service');
const AuditService = require('./services/audit-service');
const { registerEvents } = require('./events');

class ExecutorBot {
  constructor(customConfig = null, customDb = null) {
    this.config = customConfig || config;
    this.db = customDb || null;
    this.client = null;
    this.context = null;
    this.isStopping = false;
  }

  async initialize() {
    logger.info('Initializing Executor Status Bot...');

    // 1. Connect DB and run migrations
    if (!this.db) {
      this.db = getDatabase(this.config.database.path);
    }
    runMigrations(this.db);

    // 2. Instantiate Repositories
    const executorRepo = new ExecutorRepository(this.db);
    const snapshotRepo = new SnapshotRepository(this.db);
    const manualRepo = new ManualRepository(this.db);
    const settingsRepo = new SettingsRepository(this.db);
    const healthRepo = new HealthRepository(this.db);
    const panelRepo = new PanelRepository(this.db);
    const auditRepo = new AuditRepository(this.db);

    // 3. Instantiate Providers & Services
    const providerManager = new ProviderManager(this.config, healthRepo);
    const auditService = new AuditService(auditRepo);

    const statusService = new StatusService({
      executorRepo,
      snapshotRepo,
      manualRepo,
      settingsRepo,
      healthRepo,
      providerManager,
      staleThresholdSeconds: this.config.polling.staleThresholdSeconds
    });

    const panelService = new PanelService(statusService, panelRepo);

    const pollingService = new PollingService(
      statusService,
      panelService,
      () => this.client,
      { intervalSeconds: this.config.polling.intervalSeconds }
    );

    // 4. Create Discord Client
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
      ]
    });

    // 5. Build Shared Context
    this.context = {
      config: this.config,
      db: this.db,
      executorRepo,
      snapshotRepo,
      manualRepo,
      settingsRepo,
      healthRepo,
      panelRepo,
      auditRepo,
      auditService,
      providerManager,
      statusService,
      panelService,
      pollingService,
      client: this.client
    };

    // 6. Register Event Handlers
    registerEvents(this.client, this.context);

    // Error handling on Discord client
    this.client.on('error', (err) => {
      logger.error('Discord Client Error:', err.message);
    });

    return this.context;
  }

  async start() {
    await this.initialize();

    const validation = validateConfig(true);
    if (!validation.valid) {
      logger.warn('Discord credentials not configured: ' + validation.errors.join(' '));
      logger.warn('Bot initialized in offline/management mode (Discord gateway not connected).');
      return this.context;
    }

    logger.info('Connecting to Discord Gateway...');
    try {
      await this.client.login(this.config.discord.token);
      logger.info('Discord login successful.');
    } catch (err) {
      logger.error('Failed to log in to Discord:', err.message);
      throw err;
    }

    // Start lightweight HTTP health server for cloud hosting platforms (Render, Koyeb, Railway, etc.)
    const port = process.env.PORT || 3000;
    try {
      this.httpServer = http.createServer((req, res) => {
        if (req.url === '/health' || req.url === '/') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'ok',
            service: 'executor-status-bot',
            uptime: Math.floor(process.uptime()),
            discordReady: Boolean(this.client?.isReady())
          }));
        } else {
          res.writeHead(404);
          res.end();
        }
      });
      this.httpServer.listen(port, '0.0.0.0', () => {
        logger.info(`Health check HTTP server listening on port ${port} (Ready for 24/7 Cloud hosting)`);

        // Render & Cloud Free Tier Anti-Sleep Keep-Alive
        const externalUrl = process.env.RENDER_EXTERNAL_URL || process.env.KEEP_ALIVE_URL;
        if (externalUrl) {
          const pingUrl = externalUrl.replace(/\/$/, '') + '/health';
          logger.info(`Anti-sleep keep-alive enabled: pinging ${pingUrl} every 10 minutes.`);
          setInterval(async () => {
            try {
              const res = await fetch(pingUrl);
              logger.debug(`Keep-alive ping response: ${res.status}`);
            } catch (pingErr) {
              logger.warn(`Keep-alive ping failed: ${pingErr.message}`);
            }
          }, 10 * 60 * 1000);
        }
      });
    } catch (httpErr) {
      logger.warn(`Could not start HTTP server on port ${port}:`, httpErr.message);
    }

    return this.context;
  }

  async stop() {
    if (this.isStopping) return;
    this.isStopping = true;
    logger.info('Gracefully shutting down Executor Status Bot...');

    if (this.context?.pollingService) {
      this.context.pollingService.stop();
    }

    if (this.httpServer) {
      try {
        this.httpServer.close();
      } catch {
        // Ignore
      }
    }

    if (this.client) {
      try {
        await this.client.destroy();
        logger.info('Discord client destroyed.');
      } catch (err) {
        logger.error('Error destroying Discord client:', err.message);
      }
    }

    closeDatabase();
    logger.info('Shutdown complete.');
  }
}

module.exports = ExecutorBot;
