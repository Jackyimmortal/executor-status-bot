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
  normalizePrice,
  normalizePercentage,
  normalizeBoolean
} = require('../utils/normalizer');

class ExecutorsOnlineProvider extends BaseProvider {
  constructor(config, healthRepo, httpClient) {
    super(PROVIDERS.PRIMARY, config, healthRepo, httpClient);
  }

  validateResponse(data) {
    if (!Array.isArray(data)) {
      return { valid: false, error: 'Expected JSON array of executors from ExecutorsOnline API' };
    }

    const items = [];
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      if (!item || typeof item !== 'object') {
        continue;
      }
      if (!item.title && !item.name) {
        continue;
      }
      items.push(item);
    }

    return {
      valid: true,
      items
    };
  }

  normalizeRecord(raw) {
    if (!raw) return null;
    const title = raw.title || raw.name || '';
    const canonicalName = toCanonicalName(title);
    if (!canonicalName) {
      // Not a recognized target or alias, or unidentifiable
      return null;
    }

    const platform = normalizePlatform(raw.platform || raw.type || 'Windows');
    let status = STATUS.UNKNOWN;
    if (typeof raw.updateStatus === 'boolean') {
      status = raw.updateStatus ? STATUS.UPDATED : STATUS.OUTDATED;
    }

    let securityStatus = SECURITY_STATUS.UNKNOWN;
    if (typeof raw.detected === 'boolean') {
      securityStatus = raw.detected ? SECURITY_STATUS.DETECTED : SECURITY_STATUS.UNDETECTED;
    }

    const price = normalizePrice(raw.cost, raw.free);
    const suncPercentage = normalizePercentage(raw.suncPercentage !== undefined ? raw.suncPercentage : (raw.sunc ? raw.sunc.percentage : null));
    const uncPercentage = normalizePercentage(raw.uncPercentage !== undefined ? raw.uncPercentage : raw.unc);
    const decompilerEnabled = normalizeBoolean(raw.decompiler);
    const multiEnabled = normalizeBoolean(raw.multiInject !== undefined ? raw.multiInject : raw.multiInstance);

    return {
      canonicalName,
      displayName: toDisplayName(canonicalName),
      originalName: title,
      version: raw.version ? String(raw.version).trim() : null,
      platform,
      price,
      status,
      securityStatus,
      suncPercentage,
      uncPercentage,
      decompilerEnabled,
      multiEnabled,
      source: this.name,
      websiteUrl: raw.websitelink || null,
      discordUrl: raw.discordlink || null,
      rawUpdatedAt: raw.updatedDate || null
    };
  }
}

module.exports = ExecutorsOnlineProvider;
