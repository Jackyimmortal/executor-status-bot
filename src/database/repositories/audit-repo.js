'use strict';

class AuditRepository {
  constructor(db) {
    this.db = db;
  }

  log(actorId, action, targetId = null, details = null) {
    const now = new Date().toISOString();
    const detailsStr = typeof details === 'object' && details !== null
      ? JSON.stringify(details)
      : (details ? String(details) : null);

    const result = this.db.prepare(`
      INSERT INTO audit_logs (actor_id, action, target_id, details, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(actorId, action, targetId ? String(targetId) : null, detailsStr, now);

    return {
      id: Number(result.lastInsertRowid),
      actor_id: actorId,
      action,
      target_id: targetId,
      details: detailsStr,
      created_at: now
    };
  }

  getRecent(limit = 50) {
    return this.db.prepare(`
      SELECT * FROM audit_logs
      ORDER BY id DESC
      LIMIT ?
    `).all(limit);
  }

  getByActor(actorId, limit = 50) {
    return this.db.prepare(`
      SELECT * FROM audit_logs
      WHERE actor_id = ?
      ORDER BY id DESC
      LIMIT ?
    `).all(actorId, limit);
  }
}

module.exports = AuditRepository;
