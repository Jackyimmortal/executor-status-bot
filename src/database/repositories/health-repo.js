'use strict';

class HealthRepository {
  constructor(db) {
    this.db = db;
  }

  recordAttempt(providerName) {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO provider_health (provider_name, last_attempt_at)
      VALUES (?, ?)
      ON CONFLICT(provider_name) DO UPDATE SET
        last_attempt_at = excluded.last_attempt_at
    `).run(providerName, now);
  }

  recordSuccess(providerName) {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO provider_health (provider_name, last_attempt_at, last_success_at, last_error_code, last_error_message)
      VALUES (?, ?, ?, NULL, NULL)
      ON CONFLICT(provider_name) DO UPDATE SET
        last_attempt_at = excluded.last_attempt_at,
        last_success_at = excluded.last_success_at,
        last_error_code = NULL,
        last_error_message = NULL
    `).run(providerName, now, now);
  }

  recordFailure(providerName, errorCode, errorMessage) {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO provider_health (provider_name, last_attempt_at, last_failure_at, last_error_code, last_error_message)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(provider_name) DO UPDATE SET
        last_attempt_at = excluded.last_attempt_at,
        last_failure_at = excluded.last_failure_at,
        last_error_code = excluded.last_error_code,
        last_error_message = excluded.last_error_message
    `).run(providerName, now, now, String(errorCode || 'UNKNOWN'), String(errorMessage || 'Unknown error'));
  }

  getHealth(providerName) {
    return this.db.prepare(`
      SELECT * FROM provider_health WHERE provider_name = ?
    `).get(providerName);
  }

  getAll() {
    return this.db.prepare(`
      SELECT * FROM provider_health
    `).all();
  }
}

module.exports = HealthRepository;
