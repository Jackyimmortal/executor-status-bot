'use strict';

class AuditService {
  constructor(auditRepo) {
    this.auditRepo = auditRepo;
  }

  log(actorId, action, targetId = null, details = null) {
    return this.auditRepo.log(actorId, action, targetId, details);
  }

  getRecentLogs(limit = 25) {
    return this.auditRepo.getRecent(limit);
  }
}

module.exports = AuditService;
