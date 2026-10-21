'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const ExecutorsOnlineProvider = require('../src/providers/executors-online');
const RobloxExecutorsProvider = require('../src/providers/roblox-executors');
const { STATUS, SECURITY_STATUS, PLATFORM, PRICE, PROVIDERS } = require('../src/utils/constants');

test('Providers: ExecutorsOnlineProvider schema validation and normalization', () => {
  const provider = new ExecutorsOnlineProvider({ enabled: true, url: 'https://test', timeoutMs: 5000 }, null);

  // Validate non-array
  assert.equal(provider.validateResponse({ invalid: true }).valid, false);

  // Validate valid array
  const mockPayload = [
    {
      title: 'Solara',
      version: '0.1.7c',
      platform: 'Windows',
      updateStatus: true,
      detected: false,
      suncPercentage: 59,
      uncPercentage: 66,
      free: true,
      cost: 'Free',
      decompiler: false,
      multiInject: false
    },
    {
      title: 'UnknownFakeApp',
      version: '1.0'
    }
  ];

  const validation = provider.validateResponse(mockPayload);
  assert.equal(validation.valid, true);
  assert.equal(validation.items.length, 2);

  // Normalize Solara
  const solaraNorm = provider.normalizeRecord(mockPayload[0]);
  assert.ok(solaraNorm);
  assert.equal(solaraNorm.canonicalName, 'solara');
  assert.equal(solaraNorm.displayName, 'Solara');
  assert.equal(solaraNorm.status, STATUS.UPDATED);
  assert.equal(solaraNorm.securityStatus, SECURITY_STATUS.UNDETECTED);
  assert.equal(solaraNorm.price, PRICE.FREE);
  assert.equal(solaraNorm.suncPercentage, 59);
  assert.equal(solaraNorm.uncPercentage, 66);
  assert.equal(solaraNorm.decompilerEnabled, false);
  assert.equal(solaraNorm.multiEnabled, false);

  // Unknown app returns null
  assert.equal(provider.normalizeRecord(mockPayload[1]), null);
});

test('Providers: Missing fields remain null or UNKNOWN, not false or 0', () => {
  const provider = new ExecutorsOnlineProvider({ enabled: true, url: 'https://test', timeoutMs: 5000 }, null);

  const sparseRecord = {
    title: 'Volt'
    // version, platform, free, updateStatus, detected, unc, etc. are all omitted
  };

  const norm = provider.normalizeRecord(sparseRecord);
  assert.ok(norm);
  assert.equal(norm.canonicalName, 'volt');
  assert.equal(norm.version, null, 'Missing version must be null');
  assert.equal(norm.status, STATUS.UNKNOWN, 'Missing status must be UNKNOWN');
  assert.equal(norm.securityStatus, SECURITY_STATUS.UNKNOWN, 'Missing security status must be UNKNOWN');
  assert.equal(norm.price, PRICE.UNKNOWN, 'Missing price must be UNKNOWN');
  assert.equal(norm.suncPercentage, null, 'Missing sunc must be null, never 0');
  assert.equal(norm.uncPercentage, null, 'Missing unc must be null, never 0');
  assert.equal(norm.decompilerEnabled, null, 'Missing decompiler must be null, never false');
  assert.equal(norm.multiEnabled, null, 'Missing multi must be null, never false');
});

test('Providers: RobloxExecutorsProvider multi-platform expansion', () => {
  const provider = new RobloxExecutorsProvider({ enabled: true, url: 'https://test', timeoutMs: 5000 }, null);

  const mockPayload = {
    executors: [
      {
        slug: 'delta',
        name: 'Delta',
        priceModel: 'FREE',
        priceText: 'Free',
        sunc: 100,
        unc: 99,
        decompiler: true,
        multiInject: true,
        platforms: [
          {
            platform: 'ANDROID',
            status: 'WORKING',
            executorVersion: '2.729.840'
          },
          {
            platform: 'IOS',
            status: 'UPDATE_PENDING',
            executorVersion: '2.729.838'
          }
        ]
      }
    ]
  };

  const validation = provider.validateResponse(mockPayload);
  assert.equal(validation.valid, true);

  const normalizedList = provider.normalizeRecord(mockPayload.executors[0]);
  assert.equal(normalizedList.length, 2, 'Delta should expand into 2 distinct platform records');

  const androidRecord = normalizedList.find(r => r.platform === PLATFORM.ANDROID);
  const iosRecord = normalizedList.find(r => r.platform === PLATFORM.IOS);

  assert.ok(androidRecord);
  assert.equal(androidRecord.version, '2.729.840');
  assert.equal(androidRecord.status, STATUS.UPDATED);
  assert.equal(androidRecord.suncPercentage, 100);

  assert.ok(iosRecord);
  assert.equal(iosRecord.version, '2.729.838');
  assert.equal(iosRecord.status, STATUS.OUTDATED);
});
