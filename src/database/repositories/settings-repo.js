'use strict';

class SettingsRepository {
  constructor(db) {
    this.db = db;
  }

  get(key, defaultValue = null) {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : defaultValue;
  }

  set(key, value) {
    const strVal = String(value);
    this.db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, strVal);
  }

  getAll() {
    const rows = this.db.prepare('SELECT key, value FROM settings').all();
    const result = {};
    for (const r of rows) {
      result[r.key] = r.value;
    }
    return result;
  }

  delete(key) {
    return this.db.prepare('DELETE FROM settings WHERE key = ?').run(key).changes > 0;
  }
}

module.exports = SettingsRepository;
