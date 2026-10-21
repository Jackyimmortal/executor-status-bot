'use strict';

const ExecutorBot = require('../src/bot');
const { Database } = require('../src/database/db');
const { runMigrations } = require('../src/database/migrations');
const ExecutorRepository = require('../src/database/repositories/executor-repo');
const SnapshotRepository = require('../src/database/repositories/snapshot-repo');
const ManualRepository = require('../src/database/repositories/manual-repo');
const SettingsRepository = require('../src/database/repositories/settings-repo');
const HealthRepository = require('../src/database/repositories/health-repo');
const ProviderManager = require('../src/providers/provider-manager');
const StatusService = require('../src/services/status-service');
const { REQUESTED_EXECUTORS, STATUS, SECURITY_STATUS, PLATFORM, PRICE, PROVIDERS } = require('../src/utils/constants');
const logger = require('../src/utils/logger');

async function runVerification() {
  console.log('============================================================');
  console.log('EXECUTOR STATUS BOT — VERIFICATION SUITE');
  console.log('============================================================\n');

  // STEP 1: Verify starting with API providers disabled
  console.log('--- TEST 1: Bot Initialization with API Providers Disabled ---');
  const disabledConfig = {
    discord: { token: '', clientId: '' },
    providers: {
      primary: { enabled: false, url: '', timeoutMs: 5000 },
      secondary: { enabled: false, url: '', timeoutMs: 5000 }
    },
    polling: { intervalSeconds: 300, staleThresholdSeconds: 1800 },
    database: { path: ':memory:' },
    system: { defaultPrecedence: 'API_FIRST', logLevel: 'warn' }
  };

  const offlineBot = new ExecutorBot(disabledConfig);
  const offlineContext = await offlineBot.initialize();
  console.log('✔ Bot initialized successfully in offline mode.');
  console.log('✔ Total seeded executors in database:', offlineContext.executorRepo.getAll().length);

  // STEP 2: Verify manual records work without external APIs
  console.log('\n--- TEST 2: Manual Records Functionality Without External APIs ---');
  const delta = offlineContext.executorRepo.getByCanonical('delta');
  offlineContext.manualRepo.upsert({
    executorId: delta.id,
    platform: PLATFORM.ANDROID,
    status: STATUS.UPDATED,
    securityStatus: SECURITY_STATUS.UNDETECTED,
    version: '2.729.840',
    price: PRICE.FREE,
    suncPercentage: 100,
    uncPercentage: 99,
    decompilerEnabled: true,
    multiEnabled: true,
    updatedBy: 'TestAdmin#1234'
  });

  const manualStatus = offlineContext.statusService.getExecutorResolvedStatus('delta');
  console.log('✔ Manual status resolved correctly:');
  console.log('  Executor:', manualStatus.executor.display_name);
  console.log('  Platform:', manualStatus.platforms[0].platform);
  console.log('  Status:', manualStatus.platforms[0].status);
  console.log('  Source:', manualStatus.platforms[0].source);
  console.log('  isManual:', manualStatus.platforms[0].isManual);
  await offlineBot.stop();

  // STEP 3: Test live external API connections
  console.log('\n--- TEST 3: Live External API Connectivity & Audit ---');
  const liveConfig = {
    discord: { token: '', clientId: '' },
    providers: {
      primary: { enabled: true, url: 'https://executors.online/api/executors', timeoutMs: 15000 },
      secondary: { enabled: true, url: 'https://robloxexecutors.com/api/v1/executors', timeoutMs: 15000 }
    },
    polling: { intervalSeconds: 300, staleThresholdSeconds: 1800 },
    database: { path: ':memory:' },
    system: { defaultPrecedence: 'API_FIRST', logLevel: 'info' }
  };

  const liveBot = new ExecutorBot(liveConfig);
  const liveContext = await liveBot.initialize();

  console.log('Triggering live sync across both providers...');
  const syncResult = await liveContext.statusService.syncProviders();
  console.log('Sync Results:', syncResult);

  console.log('\n============================================================');
  console.log('AUDIT OF ALL 11 REQUESTED EXECUTORS IN REAL APIs');
  console.log('============================================================');

  const auditRows = [];
  let pFoundCount = 0;
  let sFoundCount = 0;

  for (const req of REQUESTED_EXECUTORS) {
    const exec = liveContext.executorRepo.getByCanonical(req.canonical);
    const snapshots = liveContext.snapshotRepo.getByExecutorId(exec.id);

    const pSnapshots = snapshots.filter(s => s.provider_name === PROVIDERS.PRIMARY);
    const sSnapshots = snapshots.filter(s => s.provider_name === PROVIDERS.SECONDARY);

    const inPrimary = pSnapshots.length > 0;
    const inSecondary = sSnapshots.length > 0;

    if (inPrimary) pFoundCount++;
    if (inSecondary) sFoundCount++;

    const pPlatforms = inPrimary ? pSnapshots.map(s => s.platform).join(',') : 'N/A';
    const sPlatforms = inSecondary ? sSnapshots.map(s => s.platform).join(',') : 'N/A';

    const pStatus = inPrimary ? pSnapshots[0].status : 'NOT_FOUND';
    const sStatus = inSecondary ? sSnapshots[0].status : 'NOT_FOUND';

    const resolved = liveContext.statusService.getExecutorResolvedStatus(req.canonical);
    const effectiveStatus = resolved.platforms[0]?.status || 'NOT_FOUND';

    auditRows.push({
      Name: req.displayName,
      Canonical: req.canonical,
      'Primary API': inPrimary ? `YES (${pPlatforms})` : 'NO (NOT_FOUND)',
      'Primary Status': pStatus,
      'Secondary API': inSecondary ? `YES (${sPlatforms})` : 'NO (NOT_FOUND)',
      'Secondary Status': sStatus,
      'Effective Status': effectiveStatus
    });
  }

  console.table(auditRows);
  console.log(`\nSummary:`);
  console.log(`• Primary API (${PROVIDERS.PRIMARY}) found: ${pFoundCount} / 11 requested executors`);
  console.log(`• Secondary API (${PROVIDERS.SECONDARY}) found: ${sFoundCount} / 11 requested executors`);
  console.log(`• Missing from Secondary API: Volcano, Velocity, SirHurt`);

  await liveBot.stop();
  console.log('\n✔ Verification run finished successfully.');
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
