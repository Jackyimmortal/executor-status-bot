'use strict';

const {
  STATUS,
  SECURITY_STATUS,
  PLATFORM,
  PRICE,
  REQUESTED_EXECUTORS
} = require('./constants');

/**
 * Normalizes an executor name to its canonical identifier.
 * Returns the canonical name or null if not a known executor.
 */
function toCanonicalName(input) {
  if (!input || typeof input !== 'string') return null;
  const clean = input.trim().toLowerCase().replace(/\s+/g, ' ');

  // Exact canonical match
  for (const exec of REQUESTED_EXECUTORS) {
    if (exec.canonical === clean) return exec.canonical;
  }

  // Alias match
  for (const exec of REQUESTED_EXECUTORS) {
    for (const alias of exec.aliases) {
      if (alias === clean) return exec.canonical;
    }
  }

  // Word boundary matching, ensuring we do NOT match dissimilar products
  // E.g. "madium" should not match "madius"
  for (const exec of REQUESTED_EXECUTORS) {
    // Check if input begins with or contains whole word
    const regex = new RegExp(`\\b${exec.canonical}\\b`, 'i');
    if (regex.test(clean)) {
      return exec.canonical;
    }
  }

  return null;
}

/**
 * Returns the official display name for a canonical name or original text.
 */
function toDisplayName(canonicalOrInput) {
  const canonical = toCanonicalName(canonicalOrInput);
  if (!canonical) return String(canonicalOrInput || '').trim();

  const found = REQUESTED_EXECUTORS.find(e => e.canonical === canonical);
  return found ? found.displayName : canonical;
}

/**
 * Normalizes platform strings to Windows, Android, iOS, or Other.
 */
function normalizePlatform(input) {
  if (!input || typeof input !== 'string') return PLATFORM.OTHER;
  const p = input.trim().toUpperCase();
  if (p.includes('WIN') || p.includes('PC')) return PLATFORM.WINDOWS;
  if (p.includes('ANDRO')) return PLATFORM.ANDROID;
  if (p.includes('IOS') || p.includes('MAC') || p.includes('APPLE')) return PLATFORM.IOS;
  return PLATFORM.OTHER;
}

/**
 * Normalizes general status values.
 */
function normalizeStatus(input) {
  if (typeof input === 'boolean') {
    return input ? STATUS.UPDATED : STATUS.OUTDATED;
  }
  if (!input || typeof input !== 'string') return STATUS.UNKNOWN;
  const s = input.trim().toUpperCase();
  if (s === 'UPDATED' || s === 'WORKING' || s === 'ONLINE' || s === 'UP') return STATUS.UPDATED;
  if (s === 'OUTDATED' || s === 'DOWN' || s === 'OFFLINE' || s === 'UPDATE_PENDING' || s === 'PATCHED') return STATUS.OUTDATED;
  if (s === 'STALE') return STATUS.STALE;
  if (s === 'CONFLICT') return STATUS.CONFLICT;
  if (s === 'NOT_FOUND') return STATUS.NOT_FOUND;
  return STATUS.UNKNOWN;
}

/**
 * Normalizes security status values.
 */
function normalizeSecurityStatus(input) {
  if (typeof input === 'boolean') {
    return input ? SECURITY_STATUS.DETECTED : SECURITY_STATUS.UNDETECTED;
  }
  if (!input || typeof input !== 'string') return SECURITY_STATUS.UNKNOWN;
  const s = input.trim().toUpperCase();
  if (s.includes('UNDETECT') || s === 'SAFE') return SECURITY_STATUS.UNDETECTED;
  if (s.includes('DETECT') || s.includes('BANWAVE')) return SECURITY_STATUS.DETECTED;
  return SECURITY_STATUS.UNKNOWN;
}

/**
 * Normalizes price values.
 */
function normalizePrice(input, freeFlag = null) {
  if (freeFlag === true) return PRICE.FREE;
  if (freeFlag === false) return PRICE.PAID;
  if (!input || typeof input !== 'string') return PRICE.UNKNOWN;
  const p = input.trim().toUpperCase();
  if (p.includes('FREE') || p === '$0' || p === '0') return PRICE.FREE;
  if (p.includes('PAID') || p.includes('$') || p.includes('SUB') || p.includes('BUY')) return PRICE.PAID;
  return PRICE.UNKNOWN;
}

/**
 * Normalizes percentage fields (0 - 100), returning null if unavailable.
 */
function normalizePercentage(input) {
  if (input === null || input === undefined || input === '') return null;
  const num = typeof input === 'number' ? input : parseFloat(String(input).replace('%', ''));
  if (Number.isNaN(num) || num < 0) return null;
  return Math.min(100, Math.max(0, Math.round(num * 100) / 100));
}

/**
 * Normalizes boolean feature support, returning null if unavailable.
 */
function normalizeBoolean(input) {
  if (input === null || input === undefined || input === '') return null;
  if (typeof input === 'boolean') return input;
  const s = String(input).trim().toLowerCase();
  if (s === 'true' || s === 'yes' || s === '1' || s === 'supported') return true;
  if (s === 'false' || s === 'no' || s === '0' || s === 'unsupported') return false;
  return null;
}

module.exports = {
  toCanonicalName,
  toDisplayName,
  normalizePlatform,
  normalizeStatus,
  normalizeSecurityStatus,
  normalizePrice,
  normalizePercentage,
  normalizeBoolean
};
