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
const PanelRepository = require('../src/database/repositories/panel-repo');
const AuditRepository = require('../src/database/repositories/audit-repo');
const { STATUS, SECURITY_STATUS, PLATFORM, PRICE, PROVIDERS } = require('../src/utils/constants');

test('Database: Initialization and Migrations', () => {
  const db = new Database(':memory:');
  runMigrations(db);

  const executorRepo = new ExecutorRepository(db);
  const executors = executorRepo.getAll();

  assert.equal(executors.length, 11, 'Should have 11 seeded executors');
  assert.ok(executors.some(e => e.canonical_name === 'delta'));
  assert.ok(executors.some(e => e.canonical_name === 'potassium'));
  assert.ok(executors.some(e => e.canonical_name === 'sirhurt'));

  db.close();
});

test('Database: Executor CRUD and Duplicate Prevention', () => {
  const db = new Database(':memory:');
  runMigrations(db);
  const repo = new ExecutorRepository(db);

  // Create
  const created = repo.create('test_exec', 'Test Executor');
  assert.ok(created.id > 0);
  assert.equal(created.canonical_name, 'test_exec');

  // Duplicate canonical name prevention
  assert.throws(() => {
    repo.create('test_exec', 'Duplicate Test');
  }, /UNIQUE constraint failed/);

  // Read
  const fetched = repo.getByCanonical('test_exec');
  assert.equal(fetched.display_name, 'Test Executor');

  // Update
  const updated = repo.update(created.id, 'Updated Test Executor');
  assert.equal(updated.display_name, 'Updated Test Executor');

  // Search
  const searchResults = repo.search('updated');
  assert.equal(searchResults.length, 1);
  assert.equal(searchResults[0].id, created.id);

  // Delete
  const deleted = repo.delete(created.id);
  assert.equal(deleted, true);
  assert.equal(repo.getById(created.id), undefined);

  db.close();
});

test('Database: API Status Snapshots and Upsert', () => {
  const db = new Database(':memory:');
  runMigrations(db);
  const executorRepo = new ExecutorRepository(db);
  const snapshotRepo = new SnapshotRepository(db);

  const solara = executorRepo.getByCanonical('solara');
  assert.ok(solara);

  // Insert snapshot
  snapshotRepo.upsertSnapshot({
    executorId: solara.id,
    providerName: PROVIDERS.PRIMARY,
    version: '1.0.0',
    platform: PLATFORM.WINDOWS,
    price: PRICE.FREE,
    status: STATUS.UPDATED,
    securityStatus: SECURITY_STATUS.UNDETECTED,
    suncPercentage: 66,
    uncPercentage: 59,
    decompilerEnabled: true,
    multiEnabled: false,
    fetchedAt: '2026-10-20T12:00:00.000Z',
    responseHash: 'hash1'
  });

  let snapshots = snapshotRepo.getByExecutorId(solara.id);
  assert.equal(snapshots.length, 1);
  assert.equal(snapshots[0].version, '1.0.0');
  assert.equal(snapshots[0].sunc_percentage, 66);
  assert.equal(snapshots[0].decompiler_enabled, 1);

  // Update snapshot (Upsert with newer version)
  snapshotRepo.upsertSnapshot({
    executorId: solara.id,
    providerName: PROVIDERS.PRIMARY,
    version: '1.0.1',
    platform: PLATFORM.WINDOWS,
    price: PRICE.FREE,
    status: STATUS.UPDATED,
    securityStatus: SECURITY_STATUS.UNDETECTED,
    suncPercentage: 70,
    uncPercentage: 65,
    decompilerEnabled: true,
    multiEnabled: false,
    fetchedAt: '2026-10-20T13:00:00.000Z',
    responseHash: 'hash2'
  });

  snapshots = snapshotRepo.getByExecutorId(solara.id);
  assert.equal(snapshots.length, 1, 'Upsert should update existing platform/provider row');
  assert.equal(snapshots[0].version, '1.0.1');
  assert.equal(snapshots[0].sunc_percentage, 70);

  db.close();
});

test('Database: Manual Records and Audit Logging', () => {
  const db = new Database(':memory:');
  runMigrations(db);
  const executorRepo = new ExecutorRepository(db);
  const manualRepo = new ManualRepository(db);
  const auditRepo = new AuditRepository(db);

  const wave = executorRepo.getByCanonical('wave');
  assert.ok(wave);

  // Upsert manual status
  const manual = manualRepo.upsert({
    executorId: wave.id,
    platform: PLATFORM.WINDOWS,
    version: '2.0.0',
    price: PRICE.PAID,
    status: STATUS.UPDATED,
    securityStatus: SECURITY_STATUS.UNDETECTED,
    suncPercentage: 100,
    uncPercentage: 100,
    decompilerEnabled: true,
    multiEnabled: true,
    updatedBy: 'AdminUser#0001'
  });

  assert.equal(manual.version, '2.0.0');
  assert.equal(manual.status, STATUS.UPDATED);
  assert.equal(manual.updated_by, 'AdminUser#0001');

  // Audit log
  const auditEntry = auditRepo.log('123456789', 'MANUAL_STATUS_UPDATE', wave.id, { version: '2.0.0' });
  assert.ok(auditEntry.id > 0);
  assert.equal(auditEntry.action, 'MANUAL_STATUS_UPDATE');

  const logs = auditRepo.getRecent(10);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].actor_id, '123456789');

  db.close();
});
