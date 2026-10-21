'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  formatExecutorField,
  createStatusPanelEmbed,
  createStatusPanelComponents,
  createExecutorDetailEmbed
} = require('../src/utils/embeds');
const { STATUS, SECURITY_STATUS, PLATFORM, PRICE, STATUS_COLORS } = require('../src/utils/constants');

test('Panel: Formats executor field with available properties', () => {
  const item = {
    displayName: 'Potassium',
    platform: PLATFORM.WINDOWS,
    version: '2.5.4',
    status: STATUS.UPDATED,
    statusMessage: 'UPDATED',
    price: PRICE.PAID,
    securityStatus: SECURITY_STATUS.DETECTED,
    uncPercentage: 99,
    suncPercentage: 100,
    decompilerEnabled: true,
    multiEnabled: true,
    source: 'ExecutorsOnline',
    isManual: false,
    lastRetrieval: '2026-10-20T12:00:00.000Z'
  };

  const field = formatExecutorField(item);
  assert.ok(field.name.includes('Potassium'));
  assert.ok(field.name.includes('v2.5.4'));
  assert.ok(field.value.includes('**Status:** `UPDATED`'));
  assert.ok(field.value.includes('UNC: `99%`'));
  assert.ok(field.value.includes('sUNC: `100%`'));
  assert.ok(field.value.includes('Verified API (ExecutorsOnline)'));
});

test('Panel: Paginated embed calculation and colors', () => {
  const items = [
    { displayName: 'Delta', platform: 'Android', status: STATUS.UPDATED, securityStatus: 'UNDETECTED', price: 'FREE', uncPercentage: 99, suncPercentage: 100, isManual: false },
    { displayName: 'Xeno', platform: 'Windows', status: STATUS.OUTDATED, securityStatus: 'UNDETECTED', price: 'FREE', uncPercentage: 84, suncPercentage: 40, isManual: false },
    { displayName: 'Volt', platform: 'Windows', status: STATUS.UPDATED, securityStatus: 'UNDETECTED', price: 'PAID', uncPercentage: 99, suncPercentage: 100, isManual: false },
    { displayName: 'Real', platform: 'Windows', status: STATUS.CONFLICT, securityStatus: 'UNDETECTED', price: 'FREE', uncPercentage: 99, suncPercentage: 100, isManual: false }
  ];

  const { embed, currentPage, totalPages } = createStatusPanelEmbed(items, {
    page: 1,
    pageSize: 2,
    filter: 'ALL'
  });

  assert.equal(currentPage, 1);
  assert.equal(totalPages, 2);
  assert.equal(embed.data.fields.length, 2, 'Page 1 with pageSize 2 should have 2 fields');
  assert.equal(embed.data.color, STATUS_COLORS[STATUS.CONFLICT], 'Conflict presence should trigger conflict color');

  // Verify components
  const components = createStatusPanelComponents(currentPage, totalPages, 'ALL');
  assert.equal(components.length, 2, 'Should create 2 action rows');
});

test('Panel: Executor detail embed structure', () => {
  const resolved = {
    executor: {
      canonical_name: 'delta',
      display_name: 'Delta',
      created_at: new Date().toISOString()
    },
    platforms: [
      {
        displayName: 'Delta',
        platform: PLATFORM.ANDROID,
        version: '2.729.840',
        status: STATUS.UPDATED,
        securityStatus: SECURITY_STATUS.UNDETECTED,
        price: PRICE.FREE,
        uncPercentage: 99,
        suncPercentage: 100,
        decompilerEnabled: true,
        multiEnabled: true,
        source: 'ExecutorsOnline'
      }
    ]
  };

  const embed = createExecutorDetailEmbed(resolved);
  assert.equal(embed.data.title, 'Executor Details: Delta');
  assert.equal(embed.data.fields.length, 1);
});
