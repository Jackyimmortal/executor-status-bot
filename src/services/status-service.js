'use strict';

const {
  STATUS,
  SECURITY_STATUS,
  PLATFORM,
  PRICE,
  SOURCE_PRECEDENCE,
  PROVIDERS
} = require('../utils/constants');
const logger = require('../utils/logger');

class StatusService {
  constructor(options) {
    this.executorRepo = options.executorRepo;
    this.snapshotRepo = options.snapshotRepo;
    this.manualRepo = options.manualRepo;
    this.settingsRepo = options.settingsRepo;
    this.healthRepo = options.healthRepo;
    this.providerManager = options.providerManager;
    this.staleThresholdSeconds = options.staleThresholdSeconds || 1800;
  }

  getSourcePrecedence() {
    return this.settingsRepo.get('source_precedence', SOURCE_PRECEDENCE.API_FIRST);
  }

  setSourcePrecedence(precedence) {
    const val = precedence === SOURCE_PRECEDENCE.MANUAL_FIRST
      ? SOURCE_PRECEDENCE.MANUAL_FIRST
      : SOURCE_PRECEDENCE.API_FIRST;
    this.settingsRepo.set('source_precedence', val);
    return val;
  }

  /**
   * Synchronizes data from all active external providers into snapshot storage.
   */
  async syncProviders() {
    logger.info('Starting external API status synchronization...');
    const results = await this.providerManager.fetchAll();
    const syncSummary = {
      primary: { success: false, count: 0, error: null },
      secondary: { success: false, count: 0, error: null },
      snapshotsSaved: 0
    };

    // 1. Process Primary Provider (ExecutorsOnline)
    const primaryRes = results[PROVIDERS.PRIMARY];
    if (primaryRes) {
      if (primaryRes.success) {
        syncSummary.primary.success = true;
        const provider = this.providerManager.getProvider(PROVIDERS.PRIMARY);
        for (const raw of primaryRes.records) {
          const norm = provider.normalizeRecord(raw);
          if (norm) {
            const saved = this._saveNormalizedRecord(norm, primaryRes.fetchedAt, primaryRes.responseHash);
            if (saved) syncSummary.snapshotsSaved++;
            syncSummary.primary.count++;
          }
        }
      } else {
        syncSummary.primary.error = primaryRes.error || (primaryRes.disabled ? 'Disabled' : 'Failed');
      }
    }

    // 2. Process Secondary Provider (RobloxExecutors)
    const secondaryRes = results[PROVIDERS.SECONDARY];
    if (secondaryRes) {
      if (secondaryRes.success) {
        syncSummary.secondary.success = true;
        const provider = this.providerManager.getProvider(PROVIDERS.SECONDARY);
        for (const raw of secondaryRes.records) {
          const normList = provider.normalizeRecord(raw);
          const list = Array.isArray(normList) ? normList : (normList ? [normList] : []);
          for (const norm of list) {
            const saved = this._saveNormalizedRecord(norm, secondaryRes.fetchedAt, secondaryRes.responseHash);
            if (saved) syncSummary.snapshotsSaved++;
            syncSummary.secondary.count++;
          }
        }
      } else {
        syncSummary.secondary.error = secondaryRes.error || (secondaryRes.disabled ? 'Disabled' : 'Failed');
      }
    }

    logger.info(`Sync complete. Saved ${syncSummary.snapshotsSaved} snapshots.`);
    return syncSummary;
  }

  _saveNormalizedRecord(norm, fetchedAt, responseHash) {
    let executor = this.executorRepo.getByCanonical(norm.canonicalName);
    if (!executor) {
      executor = this.executorRepo.create(norm.canonicalName, norm.displayName);
    }

    this.snapshotRepo.upsertSnapshot({
      executorId: executor.id,
      providerName: norm.source,
      version: norm.version,
      platform: norm.platform,
      price: norm.price,
      status: norm.status,
      securityStatus: norm.securityStatus,
      suncPercentage: norm.suncPercentage,
      uncPercentage: norm.uncPercentage,
      decompilerEnabled: norm.decompilerEnabled,
      multiEnabled: norm.multiEnabled,
      fetchedAt,
      responseHash
    });

    return true;
  }

  /**
   * Checks if an ISO timestamp is older than the stale threshold.
   */
  isStale(isoTimestamp) {
    if (!isoTimestamp) return true;
    const time = new Date(isoTimestamp).getTime();
    if (Number.isNaN(time)) return true;
    const ageSeconds = (Date.now() - time) / 1000;
    return ageSeconds > this.staleThresholdSeconds;
  }

  /**
   * Resolves the effective status for a single executor and platform.
   */
  resolveExecutorPlatformStatus(executor, platform, snapshots, manualRecord, precedence = null) {
    const currentPrecedence = precedence || this.getSourcePrecedence();

    const primarySnapshot = snapshots.find(
      s => s.platform === platform && s.provider_name === PROVIDERS.PRIMARY
    );
    const secondarySnapshot = snapshots.find(
      s => s.platform === platform && s.provider_name === PROVIDERS.SECONDARY
    );

    // 1. Conflict detection between providers
    let providerConflict = false;
    let conflictDetails = null;

    if (primarySnapshot && secondarySnapshot) {
      const pStatus = primarySnapshot.status;
      const sStatus = secondarySnapshot.status;
      if (pStatus !== STATUS.UNKNOWN && sStatus !== STATUS.UNKNOWN && pStatus !== sStatus) {
        providerConflict = true;
        conflictDetails = `Primary API reports ${pStatus}, Secondary API reports ${sStatus}`;
      }
    }

    // 2. Conflict detection between API and Manual record
    let manualConflict = false;
    if (manualRecord && (primarySnapshot || secondarySnapshot)) {
      const apiStatus = (primarySnapshot ? primarySnapshot.status : null) || (secondarySnapshot ? secondarySnapshot.status : null);
      if (apiStatus && apiStatus !== STATUS.UNKNOWN && manualRecord.status !== STATUS.UNKNOWN && apiStatus !== manualRecord.status) {
        manualConflict = true;
        conflictDetails = `API reports ${apiStatus}, Manual record reports ${manualRecord.status}`;
      }
    }

    const hasConflict = providerConflict || manualConflict;

    // Source selection based on precedence
    let chosenRecord = null;
    let chosenSource = null;
    let isManual = false;

    if (currentPrecedence === SOURCE_PRECEDENCE.MANUAL_FIRST) {
      if (manualRecord) {
        chosenRecord = manualRecord;
        chosenSource = 'MANUAL (Admin)';
        isManual = true;
      } else if (primarySnapshot) {
        chosenRecord = primarySnapshot;
        chosenSource = primarySnapshot.provider_name;
      } else if (secondarySnapshot) {
        chosenRecord = secondarySnapshot;
        chosenSource = secondarySnapshot.provider_name;
      }
    } else {
      // API_FIRST
      if (primarySnapshot) {
        chosenRecord = primarySnapshot;
        chosenSource = primarySnapshot.provider_name;
      } else if (secondarySnapshot) {
        chosenRecord = secondarySnapshot;
        chosenSource = secondarySnapshot.provider_name;
      } else if (manualRecord) {
        chosenRecord = manualRecord;
        chosenSource = 'MANUAL (Admin)';
        isManual = true;
      }
    }

    if (!chosenRecord) {
      return {
        executorId: executor.id,
        canonicalName: executor.canonical_name,
        displayName: executor.display_name,
        platform,
        status: STATUS.NOT_FOUND,
        statusMessage: 'NOT FOUND IN AVAILABLE SOURCES',
        securityStatus: SECURITY_STATUS.UNKNOWN,
        version: null,
        price: PRICE.UNKNOWN,
        suncPercentage: null,
        uncPercentage: null,
        decompilerEnabled: null,
        multiEnabled: null,
        source: 'NONE',
        isManual: false,
        isStale: false,
        hasConflict: false,
        conflictDetails: null,
        lastRetrieval: null,
        lastModified: null
      };
    }

    let effectiveStatus = chosenRecord.status;
    let statusMessage = effectiveStatus;

    if (hasConflict) {
      effectiveStatus = STATUS.CONFLICT;
      statusMessage = 'CONFLICT — SOURCES DISAGREE';
    } else if (!isManual && this.isStale(chosenRecord.fetched_at)) {
      effectiveStatus = STATUS.STALE;
      statusMessage = 'STALE DATA (Out of freshness window)';
    }

    return {
      executorId: executor.id,
      canonicalName: executor.canonical_name,
      displayName: executor.display_name,
      platform,
      status: effectiveStatus,
      statusMessage,
      securityStatus: chosenRecord.security_status || SECURITY_STATUS.UNKNOWN,
      version: chosenRecord.version || null,
      price: chosenRecord.price || PRICE.UNKNOWN,
      suncPercentage: chosenRecord.sunc_percentage !== undefined ? chosenRecord.sunc_percentage : null,
      uncPercentage: chosenRecord.unc_percentage !== undefined ? chosenRecord.unc_percentage : null,
      decompilerEnabled: chosenRecord.decompiler_enabled === 1 ? true : (chosenRecord.decompiler_enabled === 0 ? false : null),
      multiEnabled: chosenRecord.multi_enabled === 1 ? true : (chosenRecord.multi_enabled === 0 ? false : null),
      source: chosenSource,
      isManual,
      isStale: !isManual && this.isStale(chosenRecord.fetched_at),
      hasConflict,
      conflictDetails,
      lastRetrieval: isManual ? null : chosenRecord.fetched_at,
      lastModified: isManual ? chosenRecord.updated_at : chosenRecord.fetched_at,
      snapshots: {
        primary: primarySnapshot || null,
        secondary: secondarySnapshot || null
      },
      manualRecord: manualRecord || null
    };
  }

  /**
   * Resolves the full list of effective records for all executors.
   */
  getAllResolvedStatuses(platformFilter = null) {
    const executors = this.executorRepo.getAll();
    const precedence = this.getSourcePrecedence();
    const resolved = [];

    for (const executor of executors) {
      const snapshots = this.snapshotRepo.getByExecutorId(executor.id);
      const manualRecords = this.manualRepo.getByExecutorId(executor.id);

      // Determine all known platforms for this executor
      const platformSet = new Set();
      for (const s of snapshots) {
        if (s.platform) platformSet.add(s.platform);
      }
      for (const m of manualRecords) {
        if (m.platform) platformSet.add(m.platform);
      }

      // Default to WINDOWS if no platform is known yet
      if (platformSet.size === 0) {
        platformSet.add(PLATFORM.WINDOWS);
      }

      for (const platform of platformSet) {
        if (platformFilter && platform !== platformFilter) {
          continue;
        }

        const manual = manualRecords.find(m => m.platform === platform) || null;
        const res = this.resolveExecutorPlatformStatus(executor, platform, snapshots, manual, precedence);
        resolved.push(res);
      }
    }

    return resolved;
  }

  /**
   * Resolves a single executor's status across all its platforms.
   */
  getExecutorResolvedStatus(query) {
    const executor = this.executorRepo.findByNameOrAlias(query);
    if (!executor) return null;

    const snapshots = this.snapshotRepo.getByExecutorId(executor.id);
    const manualRecords = this.manualRepo.getByExecutorId(executor.id);

    const platformSet = new Set();
    for (const s of snapshots) {
      if (s.platform) platformSet.add(s.platform);
    }
    for (const m of manualRecords) {
      if (m.platform) platformSet.add(m.platform);
    }
    if (platformSet.size === 0) {
      platformSet.add(PLATFORM.WINDOWS);
    }

    const platformResults = [];
    for (const platform of platformSet) {
      const manual = manualRecords.find(m => m.platform === platform) || null;
      platformResults.push(
        this.resolveExecutorPlatformStatus(executor, platform, snapshots, manual)
      );
    }

    return {
      executor,
      platforms: platformResults
    };
  }

  /**
   * Returns all current conflict items across the system.
   */
  getAllConflicts() {
    const all = this.getAllResolvedStatuses();
    return all.filter(item => item.hasConflict);
  }
}

module.exports = StatusService;
