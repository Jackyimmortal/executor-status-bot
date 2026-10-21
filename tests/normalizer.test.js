'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  toCanonicalName,
  toDisplayName,
  normalizePlatform,
  normalizeStatus,
  normalizeSecurityStatus,
  normalizePrice,
  normalizePercentage,
  normalizeBoolean
} = require('../src/utils/normalizer');
const { STATUS, SECURITY_STATUS, PLATFORM, PRICE } = require('../src/utils/constants');

test('Normalizer: All 11 Requested Executors canonical matching', () => {
  const targets = [
    { input: 'Delta', canonical: 'delta' },
    { input: 'delta mobile', canonical: 'delta' },
    { input: 'Xeno', canonical: 'xeno' },
    { input: 'Xeno Executor', canonical: 'xeno' },
    { input: 'Real', canonical: 'real' },
    { input: 'Project Real', canonical: 'real' },
    { input: 'projectreal', canonical: 'real' },
    { input: 'Madium', canonical: 'madium' },
    { input: 'Solara', canonical: 'solara' },
    { input: 'Solara v3', canonical: 'solara' },
    { input: 'Volcano', canonical: 'volcano' },
    { input: 'Wave', canonical: 'wave' },
    { input: 'Wave Executor', canonical: 'wave' },
    { input: 'Velocity', canonical: 'velocity' },
    { input: 'Volt', canonical: 'volt' },
    { input: 'voltbz', canonical: 'volt' },
    { input: 'SirHurt', canonical: 'sirhurt' },
    { input: 'Sir Hurt', canonical: 'sirhurt' },
    { input: 'Potassium', canonical: 'potassium' },
    { input: 'Potassium Pro', canonical: 'potassium' }
  ];

  for (const t of targets) {
    const canonical = toCanonicalName(t.input);
    assert.equal(canonical, t.canonical, `Input "${t.input}" should map to "${t.canonical}"`);
    assert.ok(toDisplayName(canonical).length > 0);
  }
});

test('Normalizer: Prevention of false-positive product collisions', () => {
  // Madium should NOT match Madius
  assert.equal(toCanonicalName('Madius'), null, 'Madius must not collide with Madium');
  assert.equal(toCanonicalName('Melatonin'), null, 'Melatonin must not collide with other names');
  assert.equal(toCanonicalName('Serotonin'), null, 'Serotonin must not collide with other names');
  assert.equal(toCanonicalName('Solaris'), null, 'Solaris must not collide with Solara');
  assert.equal(toCanonicalName('Voltage'), null, 'Voltage must not collide with Volt');
});

test('Normalizer: Platform normalization', () => {
  assert.equal(normalizePlatform('Windows 11 Pro'), PLATFORM.WINDOWS);
  assert.equal(normalizePlatform('pc'), PLATFORM.WINDOWS);
  assert.equal(normalizePlatform('Android APK'), PLATFORM.ANDROID);
  assert.equal(normalizePlatform('iOS 18'), PLATFORM.IOS);
  assert.equal(normalizePlatform('macOS'), PLATFORM.IOS);
  assert.equal(normalizePlatform('FreeBSD'), PLATFORM.OTHER);
  assert.equal(normalizePlatform(null), PLATFORM.OTHER);
});

test('Normalizer: Status normalization', () => {
  assert.equal(normalizeStatus(true), STATUS.UPDATED);
  assert.equal(normalizeStatus(false), STATUS.OUTDATED);
  assert.equal(normalizeStatus('WORKING'), STATUS.UPDATED);
  assert.equal(normalizeStatus('ONLINE'), STATUS.UPDATED);
  assert.equal(normalizeStatus('UPDATE_PENDING'), STATUS.OUTDATED);
  assert.equal(normalizeStatus('PATCHED'), STATUS.OUTDATED);
  assert.equal(normalizeStatus('STALE'), STATUS.STALE);
  assert.equal(normalizeStatus('UNKNOWN'), STATUS.UNKNOWN);
  assert.equal(normalizeStatus('random_text'), STATUS.UNKNOWN);
});

test('Normalizer: Security status normalization', () => {
  assert.equal(normalizeSecurityStatus(true), SECURITY_STATUS.DETECTED);
  assert.equal(normalizeSecurityStatus(false), SECURITY_STATUS.UNDETECTED);
  assert.equal(normalizeSecurityStatus('UNDETECTED'), SECURITY_STATUS.UNDETECTED);
  assert.equal(normalizeSecurityStatus('SAFE'), SECURITY_STATUS.UNDETECTED);
  assert.equal(normalizeSecurityStatus('DETECTED'), SECURITY_STATUS.DETECTED);
  assert.equal(normalizeSecurityStatus('BANWAVE'), SECURITY_STATUS.DETECTED);
  assert.equal(normalizeSecurityStatus('UNKNOWN'), SECURITY_STATUS.UNKNOWN);
});

test('Normalizer: Pricing normalization', () => {
  assert.equal(normalizePrice('$22.99 Lifetime', false), PRICE.PAID);
  assert.equal(normalizePrice('Free', true), PRICE.FREE);
  assert.equal(normalizePrice(null, true), PRICE.FREE);
  assert.equal(normalizePrice(null, false), PRICE.PAID);
  assert.equal(normalizePrice('$5.99 / week'), PRICE.PAID);
  assert.equal(normalizePrice('Free'), PRICE.FREE);
  assert.equal(normalizePrice(null, null), PRICE.UNKNOWN);
});

test('Normalizer: Percentages and Booleans', () => {
  assert.equal(normalizePercentage(100), 100);
  assert.equal(normalizePercentage('99%'), 99);
  assert.equal(normalizePercentage(105), 100, 'Should clamp to 100');
  assert.equal(normalizePercentage(-10), null, 'Negative percentage invalid');
  assert.equal(normalizePercentage(null), null, 'Null remains null');

  assert.equal(normalizeBoolean(true), true);
  assert.equal(normalizeBoolean(false), false);
  assert.equal(normalizeBoolean('yes'), true);
  assert.equal(normalizeBoolean('no'), false);
  assert.equal(normalizeBoolean('supported'), true);
  assert.equal(normalizeBoolean(null), null, 'Null boolean remains null');
});
