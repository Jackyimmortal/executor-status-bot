'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Database } = require('../src/database/db');
const { runMigrations } = require('../src/database/migrations');
const ExecutorRepository = require('../src/database/repositories/executor-repo');
const SnapshotRepository = require('../src/database/repositories/snapshot-repo');
const ManualRepository = require('../src/database/repositories/manual-repo');
const SettingsRepository = require('../src/database/repositories/settings-repo');
const HealthRepository = require('../src/database/repositories/health-repo');
const StatusService = require('../src/services/status-service');
const { STATUS, SECURITY_STATUS, PLATFORM, PRICE, SOURCE_PRECEDENCE, PROVIDERS } = require('../src/utils/constants');

function setupTestEnvironment() {
  const db = new Database(':memory:');
  runMigrations(db);
  const executorRepo = new ExecutorRepository(db);
  const snapshotRepo = new SnapshotRepository(db);
  const manualRepo = new ManualRepository(db);
  const settingsRepo = new SettingsRepository(db);
  const healthRepo = new HealthRepository(db);

  const statusService = new StatusService({
    executorRepo,
    snapshotRepo,
    manualRepo,
    settingsRepo,
    healthRepo,
    providerManager: null,
    staleThresholdSeconds: 300 // 5 minutes
  });

  return { db, executorRepo, snapshotRepo, manualRepo, settingsRepo, statusService };
}

test('Precedence: API_FIRST prioritizes API snapshot over Manual record', () => {
  const { db, executorRepo, snapshotRepo, manualRepo, statusService } = setupTestEnvironment();
  statusService.setSourcePrecedence(SOURCE_PRECEDENCE.API_FIRST);

  const xeno = executorRepo.getByCanonical('xeno');

  // API Snapshot: UPDATED
  snapshotRepo.upsertSnapshot({
    executorId: xeno.id,
    providerName: PROVIDERS.PRIMARY,
    version: '1.3.60',
    platform: PLATFORM.WINDOWS,
    price: PRICE.FREE,
    status: STATUS.UPDATED,
    securityStatus: SECURITY_STATUS.UNDETECTED,
    fetchedAt: new Date().toISOString()
  });

  // Manual Record: UPDATED
  manualRepo.upsert({
    executorId: xeno.id,
    platform: PLATFORM.WINDOWS,
    version: '1.3.50',
    status: STATUS.UPDATED,
    updatedBy: 'Admin'
  });

  const res = statusService.getExecutorResolvedStatus('xeno');
  assert.equal(res.platforms[0].source, PROVIDERS.PRIMARY);
  assert.equal(res.platforms[0].version, '1.3.60');

  db.close();
});

test('Precedence: MANUAL_FIRST prioritizes manual record over API snapshot', () => {
  const { db, executorRepo, snapshotRepo, manualRepo, statusService } = setupTestEnvironment();
  statusService.setSourcePrecedence(SOURCE_PRECEDENCE.MANUAL_FIRST);

  const xeno = executorRepo.getByCanonical('xeno');

  // API Snapshot
  snapshotRepo.upsertSnapshot({
    executorId: xeno.id,
    providerName: PROVIDERS.PRIMARY,
    version: '1.3.60',
    platform: PLATFORM.WINDOWS,
    status: STATUS.UPDATED,
    fetchedAt: new Date().toISOString()
  });

  // Manual Record
  manualRepo.upsert({
    executorId: xeno.id,
    platform: PLATFORM.WINDOWS,
    version: '1.3.61-custom',
    status: STATUS.UPDATED,
    updatedBy: 'Admin'
  });

  const res = statusService.getExecutorResolvedStatus('xeno');
  assert.equal(res.platforms[0].isManual, true);
  assert.equal(res.platforms[0].version, '1.3.61-custom');
  assert.ok(res.platforms[0].source.includes('MANUAL'));

  db.close();
});

test('Conflicts: Primary API and Secondary API disagreement', () => {
  const { db, executorRepo, snapshotRepo, statusService } = setupTestEnvironment();

  const wave = executorRepo.getByCanonical('wave');
  const now = new Date().toISOString();

  // Primary API reports UPDATED
  snapshotRepo.upsertSnapshot({
    executorId: wave.id,
    providerName: PROVIDERS.PRIMARY,
    version: '1.5.8',
    platform: PLATFORM.WINDOWS,
    status: STATUS.UPDATED,
    fetchedAt: now
  });

  // Secondary API reports OUTDATED
  snapshotRepo.upsertSnapshot({
    executorId: wave.id,
    providerName: PROVIDERS.SECONDARY,
    version: '1.5.7',
    platform: PLATFORM.WINDOWS,
    status: STATUS.OUTDATED,
    fetchedAt: now
  });

  const res = statusService.getExecutorResolvedStatus('wave');
  assert.equal(res.platforms[0].hasConflict, true);
  assert.equal(res.platforms[0].status, STATUS.CONFLICT);
  assert.equal(res.platforms[0].statusMessage, 'CONFLICT — SOURCES DISAGREE');

  db.close();
});

test('Conflicts: API and Manual status contradiction', () => {
  const { db, executorRepo, snapshotRepo, manualRepo, statusService } = setupTestEnvironment();

  const real = executorRepo.getByCanonical('real');
  const now = new Date().toISOString();

  // API says UPDATED
  snapshotRepo.upsertSnapshot({
    executorId: real.id,
    providerName: PROVIDERS.PRIMARY,
    platform: PLATFORM.WINDOWS,
    status: STATUS.UPDATED,
    fetchedAt: now
  });

  // Admin says OUTDATED
  manualRepo.upsert({
    executorId: real.id,
    platform: PLATFORM.WINDOWS,
    status: STATUS.OUTDATED,
    updatedBy: 'LeadAdmin'
  });

  const res = statusService.getExecutorResolvedStatus('real');
  assert.equal(res.platforms[0].hasConflict, true);
  assert.equal(res.platforms[0].status, STATUS.CONFLICT);

  db.close();
});

test('Stale Data: Detects snapshots older than threshold', () => {
  const { db, executorRepo, snapshotRepo, statusService } = setupTestEnvironment();

  const volcano = executorRepo.getByCanonical('volcano');

  // Timestamp 1 hour ago (threshold is 5 minutes)
  const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();

  snapshotRepo.upsertSnapshot({
    executorId: volcano.id,
    providerName: PROVIDERS.PRIMARY,
    platform: PLATFORM.WINDOWS,
    status: STATUS.UPDATED,
    fetchedAt: oneHourAgo
  });

  const res = statusService.getExecutorResolvedStatus('volcano');
  assert.equal(res.platforms[0].isStale, true);
  assert.equal(res.platforms[0].status, STATUS.STALE);
  assert.ok(res.platforms[0].statusMessage.includes('STALE'));

  db.close();
});

test('Missing Records: Outputs NOT FOUND IN AVAILABLE SOURCES', () => {
  const { db, statusService } = setupTestEnvironment();

  // SirHurt has no snapshots or manual records in this clean DB
  const res = statusService.getExecutorResolvedStatus('sirhurt');
  assert.ok(res);
  assert.equal(res.platforms[0].status, STATUS.NOT_FOUND);
  assert.equal(res.platforms[0].statusMessage, 'NOT FOUND IN AVAILABLE SOURCES');

  db.close();
});
