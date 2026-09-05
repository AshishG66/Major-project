import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';
import { socketService } from './socketService.js';

export async function checkAndTriggerAlerts(params: {
  userId: string;
  riskLevel: string;
  riskScore: number;
  systolicBP?: number;
  diastolicBP?: number;
  heartRate?: number;
  factors?: any;
}) {
  try {
    const { userId, riskLevel, riskScore, systolicBP = 120, diastolicBP = 80, heartRate = 72, factors } = params;

    // Check alert threshold triggers
    let alertLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | null = null;
    let title = '';
    let message = '';

    if (riskLevel === 'CRITICAL' || riskScore >= 75 || systolicBP >= 170) {
      alertLevel = 'CRITICAL';
      title = 'Critical Cardiovascular Risk Alert';
      message = `High acute cardiovascular risk level detected (${riskScore.toFixed(1)}%). Systolic BP: ${systolicBP} mmHg. Immediate medical evaluation recommended.`;
    } else if (riskLevel === 'HIGH' || riskScore >= 50 || systolicBP >= 145) {
      alertLevel = 'HIGH';
      title = 'Elevated Cardiac Risk Warning';
      message = `Cardiovascular risk score elevated to ${riskScore.toFixed(1)}% (${riskLevel} risk category). Review blood pressure and lipid factors.`;
    } else if (riskLevel === 'MODERATE' || riskScore >= 30 || systolicBP >= 135) {
      alertLevel = 'MODERATE';
      title = 'Moderate Risk Advisory';
      message = `Cardiovascular health metrics show moderate risk patterns (${riskScore.toFixed(1)}%). Lifestyle optimizations recommended.`;
    }

    if (!alertLevel) return null;

    // Deduplication cooldown check: check if alert of same level was created for this user in last 30 minutes
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    const existingRecent = await prisma.alert.findFirst({
      where: {
        userId,
        level: alertLevel,
        createdAt: { gte: thirtyMinsAgo },
      },
    });

    if (existingRecent) {
      logger.info(`[Alert Cooldown] Suppressed duplicate ${alertLevel} alert for user ${userId}`);
      return existingRecent;
    }

    const contributingFactors = [
      systolicBP >= 140 ? `Systolic BP (${systolicBP} mmHg)` : null,
      diastolicBP >= 90 ? `Diastolic BP (${diastolicBP} mmHg)` : null,
      heartRate >= 90 ? `Resting Heart Rate (${heartRate} bpm)` : null,
      factors?.smoking ? 'Active Smoking' : null,
      factors?.diabetes ? 'Diabetes History' : null,
    ].filter(Boolean);

    const alert = await prisma.alert.create({
      data: {
        userId,
        level: alertLevel,
        title,
        message,
        contributingFactors: contributingFactors as any,
        status: 'TRIGGERED',
      },
    });

    // Also push to System Notification table
    await prisma.notification.create({
      data: {
        userId,
        type: 'SYSTEM',
        title,
        message,
      },
    });

    // Emit real-time WebSocket alert event
    socketService.emitToUser(userId, 'cardio_alert', alert);

    return alert;
  } catch (error: any) {
    logger.warn(`Alert trigger check failed: ${error.message}`);
    return null;
  }
}
