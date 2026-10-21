'use strict';

const logger = require('../utils/logger');
const { REQUESTED_EXECUTORS } = require('../utils/constants');

const MIGRATIONS = [
  {
    id: 1,
    name: 'initial_schema',
    up: (db) => {
      // 1. executors table
      db.exec(`
        CREATE TABLE IF NOT EXISTS executors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          canonical_name TEXT NOT NULL UNIQUE,
          display_name TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_executors_canonical ON executors(canonical_name);
      `);

      // 2. api_status_snapshots table
      db.exec(`
        CREATE TABLE IF NOT EXISTS api_status_snapshots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          executor_id INTEGER NOT NULL REFERENCES executors(id) ON DELETE CASCADE,
          provider_name TEXT NOT NULL,
          version TEXT,
          platform TEXT NOT NULL,
          price TEXT,
          status TEXT NOT NULL,
          security_status TEXT,
          sunc_percentage REAL,
          unc_percentage REAL,
          decompiler_enabled INTEGER,
          multi_enabled INTEGER,
          fetched_at TEXT NOT NULL,
          response_hash TEXT,
          UNIQUE(executor_id, provider_name, platform)
        );
        CREATE INDEX IF NOT EXISTS idx_api_snapshots_exec_prov ON api_status_snapshots(executor_id, provider_name);
        CREATE INDEX IF NOT EXISTS idx_api_snapshots_platform ON api_status_snapshots(platform);
        CREATE INDEX IF NOT EXISTS idx_api_snapshots_fetched ON api_status_snapshots(fetched_at);
      `);

      // 3. manual_status_records table
      db.exec(`
        CREATE TABLE IF NOT EXISTS manual_status_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          executor_id INTEGER NOT NULL REFERENCES executors(id) ON DELETE CASCADE,
          version TEXT,
          platform TEXT NOT NULL,
          price TEXT,
          status TEXT NOT NULL,
          security_status TEXT,
          sunc_percentage REAL,
          unc_percentage REAL,
          decompiler_enabled INTEGER,
          multi_enabled INTEGER,
          updated_by TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(executor_id, platform)
        );
        CREATE INDEX IF NOT EXISTS idx_manual_records_exec ON manual_status_records(executor_id);
        CREATE INDEX IF NOT EXISTS idx_manual_records_platform ON manual_status_records(platform);
      `);

      // 4. settings table
      db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);

      // 5. provider_health table
      db.exec(`
        CREATE TABLE IF NOT EXISTS provider_health (
          provider_name TEXT PRIMARY KEY,
          last_attempt_at TEXT,
          last_success_at TEXT,
          last_failure_at TEXT,
          last_error_code TEXT,
          last_error_message TEXT
        );
      `);

      // 6. discord_panels table
      db.exec(`
        CREATE TABLE IF NOT EXISTS discord_panels (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          guild_id TEXT NOT NULL,
          channel_id TEXT NOT NULL,
          message_id TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(guild_id, channel_id)
        );
        CREATE INDEX IF NOT EXISTS idx_panels_guild_channel ON discord_panels(guild_id, channel_id);
      `);

      // 7. audit_logs table
      db.exec(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          actor_id TEXT NOT NULL,
          action TEXT NOT NULL,
          target_id TEXT,
          details TEXT,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      `);
    }
  },
  {
    id: 2,
    name: 'seed_requested_executors',
    up: (db) => {
      const now = new Date().toISOString();
      const insertStmt = db.prepare(`
        INSERT OR IGNORE INTO executors (canonical_name, display_name, created_at)
        VALUES (?, ?, ?)
      `);

      for (const exec of REQUESTED_EXECUTORS) {
        insertStmt.run(exec.canonical, exec.displayName, now);
      }
      logger.info(`Seeded ${REQUESTED_EXECUTORS.length} requested executors.`);
    }
  }
];

function runMigrations(db) {
  // Create migrations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = db.prepare('SELECT id FROM migrations').all();
  const appliedIds = new Set(appliedRows.map(r => r.id));

  for (const migration of MIGRATIONS) {
    if (!appliedIds.has(migration.id)) {
      logger.info(`Applying migration ${migration.id}: ${migration.name}...`);
      migration.up(db);
      const now = new Date().toISOString();
      db.prepare('INSERT INTO migrations (id, name, applied_at) VALUES (?, ?, ?)').run(
        migration.id,
        migration.name,
        now
      );
      logger.info(`Migration ${migration.id} applied successfully.`);
    }
  }
}

module.exports = {
  runMigrations,
  MIGRATIONS
};
