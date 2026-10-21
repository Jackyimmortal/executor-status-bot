'use strict';

const crypto = require('crypto');
const defaultHttpClient = require('../utils/http-client');
const logger = require('../utils/logger');

class BaseProvider {
  constructor(name, config, healthRepo, httpClient = defaultHttpClient) {
    this.name = name;
    this.config = config;
    this.healthRepo = healthRepo;
    this.httpClient = httpClient;
    this.lastSuccessfulFetch = null;
    this.lastError = null;
  }

  calculateHash(data) {
    try {
      const str = typeof data === 'string' ? data : JSON.stringify(data);
      return crypto.createHash('sha256').update(str).digest('hex');
    } catch {
      return null;
    }
  }

  async fetchExecutors() {
    if (!this.config.enabled) {
      logger.info(`Provider ${this.name} is disabled by configuration.`);
      return { success: false, disabled: true, records: [], raw: null };
    }

    if (!this.config.url) {
      const err = new Error(`Provider ${this.name} has no URL configured.`);
      this.lastError = err;
      if (this.healthRepo) this.healthRepo.recordFailure(this.name, 'CONFIG_ERROR', err.message);
      return { success: false, error: err.message, records: [], raw: null };
    }

    if (this.healthRepo) {
      this.healthRepo.recordAttempt(this.name);
    }

    try {
      const response = await this.httpClient.get(this.config.url, {
        apiKey: this.config.key,
        timeoutMs: this.config.timeoutMs
      });

      const validated = this.validateResponse(response.data);
      if (!validated.valid) {
        throw new Error(`Schema validation failed for ${this.name}: ${validated.error}`);
      }

      this.lastSuccessfulFetch = new Date().toISOString();
      this.lastError = null;

      if (this.healthRepo) {
        this.healthRepo.recordSuccess(this.name);
      }

      const responseHash = this.calculateHash(response.data);

      return {
        success: true,
        provider: this.name,
        fetchedAt: this.lastSuccessfulFetch,
        responseHash,
        raw: response.data,
        records: validated.items
      };
    } catch (err) {
      this.lastError = err;
      logger.error(`Error fetching from provider ${this.name}:`, err.message);

      if (this.healthRepo) {
        const code = err.message.includes('timed out') ? 'TIMEOUT' : (err.message.includes('429') ? 'RATE_LIMIT' : 'NETWORK_ERROR');
        this.healthRepo.recordFailure(this.name, code, err.message);
      }

      return {
        success: false,
        provider: this.name,
        error: err.message,
        records: [],
        raw: null
      };
    }
  }

  validateResponse(data) {
    throw new Error('validateResponse() must be implemented by subclass');
  }

  normalizeRecord(rawRecord) {
    throw new Error('normalizeRecord() must be implemented by subclass');
  }

  getHealth() {
    if (this.healthRepo) {
      return this.healthRepo.getHealth(this.name);
    }
    return {
      provider_name: this.name,
      last_success_at: this.lastSuccessfulFetch,
      last_error_message: this.lastError ? this.lastError.message : null
    };
  }

  getLastSuccessfulFetch() {
    return this.lastSuccessfulFetch;
  }

  getLastError() {
    return this.lastError;
  }
}

module.exports = BaseProvider;
