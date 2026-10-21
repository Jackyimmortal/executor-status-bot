'use strict';

const BaseProvider = require('./base-provider');
const {
  STATUS,
  SECURITY_STATUS,
  PROVIDERS
} = require('../utils/constants');
const {
  toCanonicalName,
  toDisplayName,
  normalizePlatform,
  normalizeStatus,
  normalizePrice,
  normalizePercentage,
  normalizeBoolean
} = require('../utils/normalizer');

class RobloxExecutorsProvider extends BaseProvider {
  constructor(config, healthRepo, httpClient) {
    super(PROVIDERS.SECONDARY, config, healthRepo, httpClient);
  }

  validateResponse(data) {
    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Expected JSON object from RobloxExecutors API' };
    }

    const list = Array.isArray(data) ? data : (data.executors || []);
    if (!Array.isArray(list)) {
      return { valid: false, error: 'Expected "executors" array in RobloxExecutors payload' };
    }

    const items = [];
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (item && typeof item === 'object' && (item.name || item.slug)) {
        items.push(item);
      }
    }

    return {
      valid: true,
      items
    };
  }

  normalizeRecord(raw) {
    if (!raw) return [];
    const name = raw.name || raw.slug || '';
    const canonicalName = toCanonicalName(name) || toCanonicalName(raw.slug);
    if (!canonicalName) {
      return [];
    }

    const price = normalizePrice(raw.priceText || raw.priceModel, raw.priceModel === 'FREE');
    const suncPercentage = normalizePercentage(raw.sunc);
    const uncPercentage = normalizePercentage(raw.unc);
    const decompilerEnabled = normalizeBoolean(raw.decompiler);
    const multiEnabled = normalizeBoolean(raw.multiInject);

    let securityStatus = SECURITY_STATUS.UNKNOWN;
    if (typeof raw.detected === 'boolean') {
      securityStatus = raw.detected ? SECURITY_STATUS.DETECTED : SECURITY_STATUS.UNDETECTED;
    }

    const results = [];
    const platformsList = Array.isArray(raw.platforms) && raw.platforms.length > 0
      ? raw.platforms
      : [{ platform: 'WINDOWS', status: raw.status || 'UNKNOWN', executorVersion: raw.version || null }];

    for (const p of platformsList) {
      const platform = normalizePlatform(p.platform);
      const status = normalizeStatus(p.status);
      const version = p.executorVersion || p.workingVersion || raw.version || null;

      results.push({
        canonicalName,
        displayName: toDisplayName(canonicalName),
        originalName: name,
        version: version ? String(version).trim() : null,
        platform,
        price,
        status,
        securityStatus,
        suncPercentage,
        uncPercentage,
        decompilerEnabled,
        multiEnabled,
        source: this.name,
        websiteUrl: raw.website || null,
        discordUrl: raw.discord || null,
        rawUpdatedAt: p.statusChangedAt || raw.updatedAt || null
      });
    }

    return results;
  }
}

module.exports = RobloxExecutorsProvider;
