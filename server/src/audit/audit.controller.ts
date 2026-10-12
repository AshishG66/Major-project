import { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { verifyAuditChain } from '../services/hashChainService.js';
import { canAccessPatientRecords } from '../services/accessControlService.js';

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const caller = (req as AuthRequest).user;
    if (!caller?.id) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    const patientId = req.params.patientId ? String(req.params.patientId) : undefined;

    let whereClause: any = {};
    if (caller.role === 'ADMIN') {
      if (patientId) {
        whereClause = { patientId };
      }
      // If no patientId, admin views institutional audit logs
    } else if (caller.role === 'DOCTOR') {
      if (patientId) {
        const access = await canAccessPatientRecords(caller, patientId, 'AUDIT_LOGS');
        if (!access.authorized) {
          return res.status(access.status).json({ success: false, message: access.reason });
        }
        whereClause = { patientId };
      } else {
        // Doctor without specific assigned patientId only sees actions they authored
        whereClause = { userId: caller.id };
      }
    } else {
      // Patient (USER) role: restricted to own events
      if (patientId && patientId !== caller.id) {
        return res.status(403).json({ success: false, message: 'Access denied. You can only view your own audit logs.' });
      }
      whereClause = { userId: caller.id };
    }

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { include: { profile: true } } },
    });

    res.status(200).json({ success: true, logs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyAuditIntegrity = async (req: Request, res: Response) => {
  try {
    const verification = await verifyAuditChain();
    res.status(200).json({
      success: true,
      verification,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
