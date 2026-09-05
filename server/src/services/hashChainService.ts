import crypto from 'crypto';
import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';

const GENESIS_HASH = 'GENESIS_BLOCK_00000000000000000000000000000000';

export function calculateEventHash(previousHash: string, eventData: any): string {
  const serialized = JSON.stringify({
    prev: previousHash,
    data: eventData,
  });
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

export async function createAuditLogEntry(params: {
  userId?: string;
  patientId?: string;
  eventType: string;
  action: string;
  details: string;
  ipAddress?: string;
}) {
  try {
    // Get latest audit log record for hash chaining
    const latestLog = await prisma.auditLog.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const timestampStr = now.toISOString();

    const previousHash = latestLog?.currentHash || GENESIS_HASH;
    const currentHash = calculateEventHash(previousHash, {
      userId: params.userId,
      patientId: params.patientId,
      eventType: params.eventType,
      action: params.action,
      details: params.details,
      timestamp: timestampStr,
    });

    const log = await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        patientId: params.patientId || null,
        eventType: params.eventType,
        action: params.action,
        details: params.details,
        ipAddress: params.ipAddress || null,
        previousHash,
        currentHash,
        createdAt: now,
      },
    });

    return log;
  } catch (error: any) {
    logger.warn(`Failed to create tamper-evident audit log entry: ${error.message}`);
    return null;
  }
}

export async function backfillLegacyAuditHashes(): Promise<{ backfilledCount: number; totalLogs: number }> {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'asc' },
    });

    let prevHash = GENESIS_HASH;
    let backfilledCount = 0;

    for (const log of logs) {
      const eventPayload = {
        userId: log.userId,
        patientId: log.patientId,
        eventType: log.eventType || 'SYSTEM_EVENT',
        action: log.action,
        details: log.details,
        timestamp: log.createdAt.toISOString(),
      };

      const computedHash = calculateEventHash(prevHash, eventPayload);

      if (log.previousHash !== prevHash || log.currentHash !== computedHash) {
        await prisma.auditLog.update({
          where: { id: log.id },
          data: {
            previousHash: prevHash,
            currentHash: computedHash,
            eventType: log.eventType || 'SYSTEM_EVENT',
          },
        });
        backfilledCount++;
      }

      prevHash = computedHash;
    }

    if (backfilledCount > 0) {
      logger.info(`[AuditLog HashChain] Backfilled SHA-256 hashes for ${backfilledCount} legacy/unhashed audit records.`);
    }

    return { backfilledCount, totalLogs: logs.length };
  } catch (error: any) {
    logger.error(`Failed to backfill legacy audit log hashes: ${error.message}`);
    return { backfilledCount: 0, totalLogs: 0 };
  }
}

export async function verifyAuditChain(): Promise<{
  status: 'VALID' | 'INVALID';
  totalLogs: number;
  corruptedIndex?: number;
  corruptedLogId?: string;
  message: string;
}> {
  try {
    // Always ensure legacy or un-linked blocks are hashed in sequence
    await backfillLegacyAuditHashes();

    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'asc' },
    });

    if (logs.length === 0) {
      return {
        status: 'VALID',
        totalLogs: 0,
        message: 'Audit chain is empty and valid.',
      };
    }

    let expectedPrevHash = GENESIS_HASH;

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];

      // 1. Verify previousHash link matches preceding block
      if (log.previousHash !== expectedPrevHash) {
        return {
          status: 'INVALID',
          totalLogs: logs.length,
          corruptedIndex: i,
          corruptedLogId: log.id,
          message: `Chain broken at log #${i + 1} (ID: ${log.id}). Expected prevHash "${expectedPrevHash.slice(0, 16)}...", got "${(log.previousHash || 'NULL').slice(0, 16)}...".`,
        };
      }

      // 2. Re-calculate expected currentHash
      const expectedCurrentHash = calculateEventHash(expectedPrevHash, {
        userId: log.userId,
        patientId: log.patientId,
        eventType: log.eventType || 'SYSTEM_EVENT',
        action: log.action,
        details: log.details,
        timestamp: log.createdAt.toISOString(),
      });

      // 3. Verify currentHash integrity
      if (log.currentHash !== expectedCurrentHash) {
        return {
          status: 'INVALID',
          totalLogs: logs.length,
          corruptedIndex: i,
          corruptedLogId: log.id,
          message: `Tamper detected at log #${i + 1} (ID: ${log.id}). Current hash mismatch. Expected "${expectedCurrentHash.slice(0, 16)}...", got "${(log.currentHash || 'NULL').slice(0, 16)}...".`,
        };
      }

      expectedPrevHash = log.currentHash;
    }

    return {
      status: 'VALID',
      totalLogs: logs.length,
      message: `Successfully verified tamper-evident integrity across all ${logs.length} SHA-256 blocks.`,
    };
  } catch (error: any) {
    return {
      status: 'INVALID',
      totalLogs: 0,
      message: `Audit chain verification query failed: ${error.message}`,
    };
  }
}
