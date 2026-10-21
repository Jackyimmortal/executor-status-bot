'use strict';

const logger = require('./logger');

class HttpClient {
  constructor(options = {}) {
    this.defaultTimeoutMs = options.defaultTimeoutMs || 10000;
    this.maxRetries = options.maxRetries || 3;
    this.initialBackoffMs = options.initialBackoffMs || 1000;
    this._inFlightRequests = new Map();
  }

  /**
   * Performs an HTTP GET request with retries, backoff, deduplication, and timeout handling.
   */
  async get(url, options = {}) {
    const dedupeKey = `${options.method || 'GET'}:${url}`;
    if (this._inFlightRequests.has(dedupeKey)) {
      logger.debug(`Deduplicating in-flight HTTP request for: ${url}`);
      return this._inFlightRequests.get(dedupeKey);
    }

    const promise = this._executeWithRetry(url, options)
      .finally(() => {
        this._inFlightRequests.delete(dedupeKey);
      });

    this._inFlightRequests.set(dedupeKey, promise);
    return promise;
  }

  async _executeWithRetry(url, options = {}) {
    const timeoutMs = options.timeoutMs || this.defaultTimeoutMs;
    const maxRetries = options.maxRetries !== undefined ? options.maxRetries : this.maxRetries;
    let attempt = 0;
    let backoff = this.initialBackoffMs;

    while (attempt <= maxRetries) {
      attempt++;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const headers = {
          'User-Agent': 'ExecutorStatusBot/1.0 (+https://github.com/executor-status-bot)',
          'Accept': 'application/json',
          ...(options.headers || {})
        };

        if (options.apiKey) {
          headers['Authorization'] = `Bearer ${options.apiKey}`;
        }

        const res = await fetch(url, {
          method: 'GET',
          headers,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Handle 429 Rate Limit
        if (res.status === 429) {
          const retryAfterHeader = res.headers.get('Retry-After');
          let delayMs = backoff;
          if (retryAfterHeader) {
            const parsed = parseInt(retryAfterHeader, 10);
            if (!Number.isNaN(parsed)) {
              delayMs = parsed * 1000;
            }
          }
          logger.warn(`HTTP 429 Rate Limited on ${url}. Waiting ${delayMs}ms before retry (Attempt ${attempt}/${maxRetries})`);
          if (attempt <= maxRetries) {
            await this._sleep(delayMs);
            backoff *= 2;
            continue;
          }
          throw new Error(`HTTP 429 Too Many Requests after ${maxRetries} retries`);
        }

        // Handle 5xx Server Errors (transient, retry)
        if (res.status >= 500 && res.status < 600) {
          logger.warn(`HTTP ${res.status} Server Error on ${url}. Attempt ${attempt}/${maxRetries}`);
          if (attempt <= maxRetries) {
            await this._sleep(backoff);
            backoff *= 2;
            continue;
          }
          throw new Error(`HTTP ${res.status} Server Error: ${res.statusText}`);
        }

        // Handle 4xx Client Errors (do not retry)
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} Client Error: ${res.statusText}`);
        }

        // Parse JSON
        const rawText = await res.text();
        let jsonData;
        try {
          jsonData = JSON.parse(rawText);
        } catch (jsonErr) {
          throw new Error(`Invalid JSON received from ${url}: ${jsonErr.message}`);
        }

        return {
          status: res.status,
          headers: res.headers,
          data: jsonData,
          rawText
        };
      } catch (err) {
        if (err.name === 'AbortError') {
          logger.error(`HTTP request timed out after ${timeoutMs}ms: ${url}`);
          if (attempt <= maxRetries) {
            await this._sleep(backoff);
            backoff *= 2;
            continue;
          }
          throw new Error(`Request timed out after ${timeoutMs}ms`);
        }

        if (attempt <= maxRetries && (err.message.includes('fetch failed') || err.message.includes('ECONNRESET') || err.message.includes('ETIMEDOUT'))) {
          logger.warn(`Network error on ${url}: ${err.message}. Retrying in ${backoff}ms...`);
          await this._sleep(backoff);
          backoff *= 2;
          continue;
        }

        throw err;
      }
    }

    throw new Error(`Failed to fetch ${url} after ${maxRetries} retries`);
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const defaultHttpClient = new HttpClient();

module.exports = defaultHttpClient;
module.exports.HttpClient = HttpClient;
