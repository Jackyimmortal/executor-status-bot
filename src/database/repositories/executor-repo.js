'use strict';

const { toCanonicalName } = require('../../utils/normalizer');

class ExecutorRepository {
  constructor(db) {
    this.db = db;
  }

  getAll() {
    return this.db.prepare(`
      SELECT id, canonical_name, display_name, created_at
      FROM executors
      ORDER BY id ASC
    `).all();
  }

  getById(id) {
    return this.db.prepare(`
      SELECT id, canonical_name, display_name, created_at
      FROM executors
      WHERE id = ?
    `).get(id);
  }

  getByCanonical(canonicalName) {
    return this.db.prepare(`
      SELECT id, canonical_name, display_name, created_at
      FROM executors
      WHERE canonical_name = ?
    `).get(canonicalName);
  }

  findByNameOrAlias(query) {
    if (!query) return null;
    const canonical = toCanonicalName(query);
    if (canonical) {
      const found = this.getByCanonical(canonical);
      if (found) return found;
    }

    const clean = query.trim().toLowerCase();
    // Direct exact or partial match
    return this.db.prepare(`
      SELECT id, canonical_name, display_name, created_at
      FROM executors
      WHERE lower(display_name) = ? OR lower(canonical_name) = ?
      LIMIT 1
    `).get(clean, clean);
  }

  search(query) {
    if (!query) return [];
    const term = `%${query.trim().toLowerCase()}%`;
    return this.db.prepare(`
      SELECT id, canonical_name, display_name, created_at
      FROM executors
      WHERE lower(display_name) LIKE ? OR lower(canonical_name) LIKE ?
      ORDER BY display_name ASC
    `).all(term, term);
  }

  create(canonicalName, displayName) {
    const now = new Date().toISOString();
    const result = this.db.prepare(`
      INSERT INTO executors (canonical_name, display_name, created_at)
      VALUES (?, ?, ?)
    `).run(canonicalName, displayName, now);

    return {
      id: Number(result.lastInsertRowid),
      canonical_name: canonicalName,
      display_name: displayName,
      created_at: now
    };
  }

  update(id, displayName) {
    this.db.prepare(`
      UPDATE executors
      SET display_name = ?
      WHERE id = ?
    `).run(displayName, id);
    return this.getById(id);
  }

  delete(id) {
    const result = this.db.prepare(`
      DELETE FROM executors
      WHERE id = ?
    `).run(id);
    return result.changes > 0;
  }
}

module.exports = ExecutorRepository;
