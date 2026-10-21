'use strict';

const STATUS = Object.freeze({
  UPDATED: 'UPDATED',
  OUTDATED: 'OUTDATED',
  UNKNOWN: 'UNKNOWN',
  STALE: 'STALE',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT'
});

const SECURITY_STATUS = Object.freeze({
  DETECTED: 'DETECTED',
  UNDETECTED: 'UNDETECTED',
  UNKNOWN: 'UNKNOWN'
});

const PLATFORM = Object.freeze({
  WINDOWS: 'WINDOWS',
  ANDROID: 'ANDROID',
  IOS: 'IOS',
  OTHER: 'OTHER'
});

const PRICE = Object.freeze({
  FREE: 'FREE',
  PAID: 'PAID',
  UNKNOWN: 'UNKNOWN'
});

const SOURCE_PRECEDENCE = Object.freeze({
  API_FIRST: 'API_FIRST',
  MANUAL_FIRST: 'MANUAL_FIRST'
});

const PROVIDERS = Object.freeze({
  PRIMARY: 'ExecutorsOnline',
  SECONDARY: 'RobloxExecutors',
  MANUAL: 'MANUAL'
});

// The 11 officially requested executors
const REQUESTED_EXECUTORS = Object.freeze([
  {
    canonical: 'delta',
    displayName: 'Delta',
    aliases: ['delta', 'delta executor', 'delta mobile', 'delta android', 'delta ios']
  },
  {
    canonical: 'xeno',
    displayName: 'Xeno',
    aliases: ['xeno', 'xeno executor']
  },
  {
    canonical: 'real',
    displayName: 'Real',
    aliases: ['real', 'project real', 'projectreal', 'real executor']
  },
  {
    canonical: 'madium',
    displayName: 'Madium',
    aliases: ['madium', 'madium executor']
  },
  {
    canonical: 'solara',
    displayName: 'Solara',
    aliases: ['solara', 'solara executor', 'solara v3']
  },
  {
    canonical: 'volcano',
    displayName: 'Volcano',
    aliases: ['volcano', 'volcano executor']
  },
  {
    canonical: 'wave',
    displayName: 'Wave',
    aliases: ['wave', 'wave executor', 'wave v1', 'wave v2', 'wave freemium', 'wave premium']
  },
  {
    canonical: 'velocity',
    displayName: 'Velocity',
    aliases: ['velocity', 'velocity executor']
  },
  {
    canonical: 'volt',
    displayName: 'Volt',
    aliases: ['volt', 'volt executor', 'voltbz']
  },
  {
    canonical: 'sirhurt',
    displayName: 'SirHurt',
    aliases: ['sirhurt', 'sir hurt', 'sirhurt executor', 'sirhurt v4', 'sirhurt v5']
  },
  {
    canonical: 'potassium',
    displayName: 'Potassium',
    aliases: ['potassium', 'potassium executor', 'potassium pro']
  }
]);

const STATUS_COLORS = Object.freeze({
  [STATUS.UPDATED]: 0x57F287,   // Green
  [STATUS.OUTDATED]: 0xED4245,  // Red
  [STATUS.UNKNOWN]: 0x95A5A6,   // Gray
  [STATUS.STALE]: 0xFEE75C,     // Yellow
  [STATUS.NOT_FOUND]: 0x7289DA, // Blurple/Gray
  [STATUS.CONFLICT]: 0xE67E22   // Orange
});

const STATUS_EMOJIS = Object.freeze({
  [STATUS.UPDATED]: '🟢',
  [STATUS.OUTDATED]: '🔴',
  [STATUS.UNKNOWN]: '⚪',
  [STATUS.STALE]: '🟡',
  [STATUS.NOT_FOUND]: '❓',
  [STATUS.CONFLICT]: '⚠️'
});

const SECURITY_EMOJIS = Object.freeze({
  [SECURITY_STATUS.UNDETECTED]: '🛡️ Undetected',
  [SECURITY_STATUS.DETECTED]: '⚠️ DETECTED',
  [SECURITY_STATUS.UNKNOWN]: '❓ Unknown'
});

module.exports = {
  STATUS,
  SECURITY_STATUS,
  PLATFORM,
  PRICE,
  SOURCE_PRECEDENCE,
  PROVIDERS,
  REQUESTED_EXECUTORS,
  STATUS_COLORS,
  STATUS_EMOJIS,
  SECURITY_EMOJIS
};
