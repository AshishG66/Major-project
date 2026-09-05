import { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { createAuditLogEntry } from '../services/hashChainService.js';

export const getDevices = async (req: Request, res: Response) => {
  try {
    const authUserId = (req as AuthRequest).user?.id;
    const { patientId } = req.params;

    const targetUserId = (patientId as string) || (authUserId as string);

    if (!targetUserId) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    const devices = await prisma.device.findMany({
      where: { userId: targetUserId },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, devices });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const registerDevice = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    const { deviceType, deviceIdentifier, name, isSimulated } = req.body;

    if (!deviceType || !deviceIdentifier || !name) {
      return res.status(400).json({ success: false, message: 'deviceType, deviceIdentifier, and name are required.' });
    }

    const device = await prisma.device.create({
      data: {
        userId,
        deviceType,
        deviceIdentifier,
        name,
        isSimulated: isSimulated || false,
        status: 'ACTIVE',
        lastSeen: new Date(),
      },
    });

    await createAuditLogEntry({
      userId,
      patientId: userId,
      eventType: 'DEVICE_REGISTERED',
      action: 'REGISTER_WEARABLE_DEVICE',
      details: `Registered device "${name}" (${deviceType}, ID: ${deviceIdentifier}).`,
    });

    res.status(201).json({ success: true, device });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateDeviceStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    const { id } = req.params;
    const { status } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    const device = await prisma.device.updateMany({
      where: { id: id as string, userId: userId as string },
      data: {
        status,
        lastSeen: new Date(),
      },
    });

    res.status(200).json({ success: true, message: 'Device status updated.', device });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
