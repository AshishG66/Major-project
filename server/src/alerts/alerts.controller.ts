import { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { createAuditLogEntry } from '../services/hashChainService.js';

export const getAlerts = async (req: Request, res: Response) => {
  try {
    const authUserId = (req as AuthRequest).user?.id;
    const { patientId } = req.params;

    const targetUserId = (patientId as string) || (authUserId as string);

    if (!targetUserId) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    const alerts = await prisma.alert.findMany({
      where: { userId: targetUserId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    res.status(200).json({ success: true, alerts });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const acknowledgeAlert = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    const alert = await prisma.alert.findFirst({
      where: { id: id as string, userId: userId as string },
    });

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found.' });
    }

    const updated = await prisma.alert.update({
      where: { id: alert.id },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
      },
    });

    await createAuditLogEntry({
      userId,
      patientId: userId,
      eventType: 'ALERT_ACKNOWLEDGED',
      action: 'ACKNOWLEDGE_ALERT',
      details: `Alert ID ${alert.id} (${alert.title}) acknowledged by user.`,
    });

    res.status(200).json({
      success: true,
      message: 'Alert acknowledged successfully.',
      alert: updated,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
