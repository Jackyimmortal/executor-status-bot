'use strict';

class ManualRepository {
  constructor(db) {
    this.db = db;
  }

  upsert(record) {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO manual_status_records (
        executor_id, version, platform, price, status,
        security_status, sunc_percentage, unc_percentage, decompiler_enabled,
        multi_enabled, updated_by, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(executor_id, platform) DO UPDATE SET
        version = excluded.version,
        price = excluded.price,
        status = excluded.status,
        security_status = excluded.security_status,
        sunc_percentage = excluded.sunc_percentage,
        unc_percentage = excluded.unc_percentage,
        decompiler_enabled = excluded.decompiler_enabled,
        multi_enabled = excluded.multi_enabled,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      record.executorId,
      record.version || null,
      record.platform,
      record.price || null,
      record.status,
      record.securityStatus || null,
      record.suncPercentage !== undefined ? record.suncPercentage : null,
      record.uncPercentage !== undefined ? record.uncPercentage : null,
      record.decompilerEnabled === null || record.decompilerEnabled === undefined ? null : (record.decompilerEnabled ? 1 : 0),
      record.multiEnabled === null || record.multiEnabled === undefined ? null : (record.multiEnabled ? 1 : 0),
      record.updatedBy,
      now
    );

    return this.getByExecutorAndPlatform(record.executorId, record.platform);
  }

  getByExecutorId(executorId) {
    return this.db.prepare(`
      SELECT * FROM manual_status_records
      WHERE executor_id = ?
      ORDER BY updated_at DESC
    `).all(executorId);
  }

  getByExecutorAndPlatform(executorId, platform) {
    return this.db.prepare(`
      SELECT * FROM manual_status_records
      WHERE executor_id = ? AND platform = ?
      LIMIT 1
    `).get(executorId, platform);
  }

  getAll() {
    return this.db.prepare(`
      SELECT m.*, e.canonical_name, e.display_name
      FROM manual_status_records m
      JOIN executors e ON m.executor_id = e.id
      ORDER BY m.updated_at DESC
    `).all();
  }

  delete(executorId, platform = null) {
    if (platform) {
      return this.db.prepare(`
        DELETE FROM manual_status_records
        WHERE executor_id = ? AND platform = ?
      `).run(executorId, platform).changes > 0;
    }
    return this.db.prepare(`
      DELETE FROM manual_status_records
      WHERE executor_id = ?
    `).run(executorId).changes > 0;
  }

  count() {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM manual_status_records').get();
    return row ? row.count : 0;
  }
}

module.exports = ManualRepository;
