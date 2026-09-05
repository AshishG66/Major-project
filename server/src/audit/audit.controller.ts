import { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { verifyAuditChain } from '../services/hashChainService.js';

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const role = (req as AuthRequest).user?.role;
    const userId = (req as AuthRequest).user?.id;
    const { patientId } = req.params;

    let whereClause: any = {};
    if (role !== 'ADMIN' && role !== 'DOCTOR') {
      whereClause = { userId };
    } else if (patientId) {
      whereClause = { patientId };
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
