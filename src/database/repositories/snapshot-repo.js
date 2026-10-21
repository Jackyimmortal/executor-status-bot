'use strict';

class SnapshotRepository {
  constructor(db) {
    this.db = db;
  }

  upsertSnapshot(record) {
    const stmt = this.db.prepare(`
      INSERT INTO api_status_snapshots (
        executor_id, provider_name, version, platform, price, status,
        security_status, sunc_percentage, unc_percentage, decompiler_enabled,
        multi_enabled, fetched_at, response_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(executor_id, provider_name, platform) DO UPDATE SET
        version = excluded.version,
        price = excluded.price,
        status = excluded.status,
        security_status = excluded.security_status,
        sunc_percentage = excluded.sunc_percentage,
        unc_percentage = excluded.unc_percentage,
        decompiler_enabled = excluded.decompiler_enabled,
        multi_enabled = excluded.multi_enabled,
        fetched_at = excluded.fetched_at,
        response_hash = excluded.response_hash
    `);

    stmt.run(
      record.executorId,
      record.providerName,
      record.version || null,
      record.platform,
      record.price || null,
      record.status,
      record.securityStatus || null,
      record.suncPercentage !== undefined ? record.suncPercentage : null,
      record.uncPercentage !== undefined ? record.uncPercentage : null,
      record.decompilerEnabled === null || record.decompilerEnabled === undefined ? null : (record.decompilerEnabled ? 1 : 0),
      record.multiEnabled === null || record.multiEnabled === undefined ? null : (record.multiEnabled ? 1 : 0),
      record.fetchedAt,
      record.responseHash || null
    );
  }

  getByExecutorId(executorId) {
    return this.db.prepare(`
      SELECT * FROM api_status_snapshots
      WHERE executor_id = ?
      ORDER BY fetched_at DESC
    `).all(executorId);
  }

  getByExecutorAndPlatform(executorId, platform) {
    return this.db.prepare(`
      SELECT * FROM api_status_snapshots
      WHERE executor_id = ? AND platform = ?
      ORDER BY fetched_at DESC
    `).all(executorId, platform);
  }

  getByExecutorPlatformAndProvider(executorId, platform, providerName) {
    return this.db.prepare(`
      SELECT * FROM api_status_snapshots
      WHERE executor_id = ? AND platform = ? AND provider_name = ?
      LIMIT 1
    `).get(executorId, platform, providerName);
  }

  getAll() {
    return this.db.prepare(`
      SELECT s.*, e.canonical_name, e.display_name
      FROM api_status_snapshots s
      JOIN executors e ON s.executor_id = e.id
      ORDER BY s.fetched_at DESC
    `).all();
  }

  count() {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM api_status_snapshots').get();
    return row ? row.count : 0;
  }
}

module.exports = SnapshotRepository;
