import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';

export const RETENTION_CONFIG = {
  RETENTION_SENSOR_DAYS: 90,
  RETENTION_DIGITAL_TWIN_DAYS: 180,
  RETENTION_AUDIT_DAYS: 730,
};

export interface RetentionCleanupResult {
  sensorDataDeleted: number;
  digitalTwinDeleted: number;
  auditLogsDeleted: number;
  cleanedAt: string;
}

let lastCleanupResult: RetentionCleanupResult | null = null;
let lastCleanupTime: Date | null = null;
let retentionTimer: NodeJS.Timeout | null = null;

export async function runDataRetentionCleanup(): Promise<RetentionCleanupResult> {
  const now = new Date();
  logger.info('[DataRetention] Starting scheduled data retention cleanup job...');

  const sensorCutoff = new Date(now.getTime() - RETENTION_CONFIG.RETENTION_SENSOR_DAYS * 24 * 60 * 60 * 1000);
  const digitalTwinCutoff = new Date(now.getTime() - RETENTION_CONFIG.RETENTION_DIGITAL_TWIN_DAYS * 24 * 60 * 60 * 1000);
  const auditCutoff = new Date(now.getTime() - RETENTION_CONFIG.RETENTION_AUDIT_DAYS * 24 * 60 * 60 * 1000);

  let sensorDataDeleted = 0;
  let digitalTwinDeleted = 0;
  let auditLogsDeleted = 0;

  try {
    // 1. Delete SensorData records older than 90 days
    const sensorDeleteRes = await prisma.sensorData.deleteMany({
      where: {
        timestamp: { lt: sensorCutoff },
      },
    });
    sensorDataDeleted = sensorDeleteRes.count;

    // 2. Delete DigitalTwinState records older than 180 days
    const twinDeleteRes = await prisma.digitalTwinState.deleteMany({
      where: {
        lastUpdated: { lt: digitalTwinCutoff },
      },
    });
    digitalTwinDeleted = twinDeleteRes.count;

    // 3. Delete AuditLog records older than 730 days
    const auditDeleteRes = await prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: auditCutoff },
      },
    });
    auditLogsDeleted = auditDeleteRes.count;

    const cleanedAt = now.toISOString();
    lastCleanupTime = now;
    lastCleanupResult = {
      sensorDataDeleted,
      digitalTwinDeleted,
      auditLogsDeleted,
      cleanedAt,
    };

    logger.info(
      `[DataRetention] Data retention cleanup complete. Removed: SensorData=${sensorDataDeleted}, DigitalTwinState=${digitalTwinDeleted}, AuditLogs=${auditLogsDeleted}.`
    );

    return lastCleanupResult;
  } catch (error: any) {
    logger.error(`[DataRetention] Error during data retention cleanup: ${error.message}`);
    return {
      sensorDataDeleted: 0,
      digitalTwinDeleted: 0,
      auditLogsDeleted: 0,
      cleanedAt: now.toISOString(),
    };
  }
}

export function initDataRetentionScheduler() {
  logger.info('[DataRetention] Initializing 24-hour automated Data Retention scheduler...');

  // Run initial check on server startup asynchronously
  runDataRetentionCleanup().catch((err) => {
    logger.warn(`[DataRetention] Initial startup cleanup warning: ${err.message}`);
  });

  // Schedule recurring 24-hour execution interval (86,400,000 ms)
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
  retentionTimer = setInterval(() => {
    runDataRetentionCleanup().catch((err) => {
      logger.error(`[DataRetention] Scheduled cleanup failure: ${err.message}`);
    });
  }, TWENTY_FOUR_HOURS_MS);
}

export function getRetentionStatus() {
  const nextScheduled = lastCleanupTime
    ? new Date(lastCleanupTime.getTime() + 24 * 60 * 60 * 1000).toISOString()
    : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  return {
    retentionConfig: {
      sensorDataDays: RETENTION_CONFIG.RETENTION_SENSOR_DAYS,
      digitalTwinDays: RETENTION_CONFIG.RETENTION_DIGITAL_TWIN_DAYS,
      auditLogDays: RETENTION_CONFIG.RETENTION_AUDIT_DAYS,
    },
    lastCleanupAt: lastCleanupTime ? lastCleanupTime.toISOString() : null,
    nextScheduledCleanupAt: nextScheduled,
    lastCleanupResult: lastCleanupResult || {
      sensorDataDeleted: 0,
      digitalTwinDeleted: 0,
      auditLogsDeleted: 0,
      cleanedAt: null,
    },
  };
}
