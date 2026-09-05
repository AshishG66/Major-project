import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { logger } from '../config/logger.js';
import { updateDigitalTwinState } from '../services/digitalTwinService.js';
import { createAuditLogEntry } from '../services/hashChainService.js';
import { checkAndTriggerAlerts } from '../services/alertService.js';

const sensorDataSchema = z.object({
  deviceId: z.string().optional(),
  heartRate: z.number().int().min(30).max(220).optional(),
  hrv: z.number().min(5).max(250).optional(),
  systolicBP: z.number().int().min(50).max(250).optional(),
  diastolicBP: z.number().int().min(30).max(150).optional(),
  spo2: z.number().min(70).max(100).optional(),
  ecgValue: z.number().optional(),
  ppgValue: z.number().optional(),
  activityMins: z.number().int().min(0).max(1440).optional(),
  sleepHours: z.number().min(0).max(24).optional(),
  temperature: z.number().min(30).max(45).optional(),
  weight: z.number().min(10).max(300).optional(),
  glucose: z.number().int().min(30).max(500).optional(),
  isSimulated: z.boolean().optional(),
  timestamp: z.string().datetime().optional(),
});

export const ingestSensorData = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    const parsed = sensorDataSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Sensor payload range or format validation failed. Obviously invalid physiological values rejected.',
        errors: parsed.error.format(),
      });
    }

    const data = parsed.data;

    // Validate device association if deviceId provided
    if (data.deviceId) {
      const device = await prisma.device.findFirst({
        where: { id: data.deviceId, userId },
      });
      if (!device) {
        return res.status(400).json({
          success: false,
          message: 'Specified deviceId is not registered to this patient.',
        });
      }
      // Update device lastSeen
      await prisma.device.update({
        where: { id: data.deviceId },
        data: { lastSeen: new Date() },
      });
    }

    // Determine payload data quality
    let dataQuality = 'HIGH';
    let confidence = 0.95;
    if (data.spo2 && data.spo2 < 90) {
      dataQuality = 'MEDIUM';
      confidence = 0.85;
    }

    const record = await prisma.sensorData.create({
      data: {
        userId,
        deviceId: data.deviceId || null,
        heartRate: data.heartRate || null,
        hrv: data.hrv || null,
        systolicBP: data.systolicBP || null,
        diastolicBP: data.diastolicBP || null,
        spo2: data.spo2 || null,
        ecgValue: data.ecgValue || null,
        ppgValue: data.ppgValue || null,
        activityMins: data.activityMins || 0,
        sleepHours: data.sleepHours || 0,
        temperature: data.temperature || null,
        weight: data.weight || null,
        glucose: data.glucose || null,
        confidence,
        dataQuality,
        isSimulated: data.isSimulated || false,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      },
    });

    // Update Digital Twin state asynchronously
    const twinState = await updateDigitalTwinState(userId, {
      heartRate: data.heartRate,
      hrv: data.hrv,
      systolicBP: data.systolicBP,
      diastolicBP: data.diastolicBP,
      spo2: data.spo2,
      activityMins: data.activityMins,
      sleepHours: data.sleepHours,
      isSimulated: data.isSimulated,
    });

    // Check alert thresholds
    if (data.systolicBP || data.heartRate) {
      await checkAndTriggerAlerts({
        userId,
        riskLevel: twinState?.riskLevel || 'LOW',
        riskScore: twinState?.riskScore || 15.0,
        systolicBP: data.systolicBP,
        diastolicBP: data.diastolicBP,
        heartRate: data.heartRate,
      });
    }

    // Record audit log
    await createAuditLogEntry({
      userId,
      patientId: userId,
      eventType: 'SENSOR_INGESTION',
      action: 'INGEST_SENSOR_PAYLOAD',
      details: `Ingested physiological sensor payload (${data.isSimulated ? 'Simulated' : 'Wearable'}). Record ID: ${record.id}`,
    });

    res.status(201).json({
      success: true,
      message: 'Physiological sensor payload ingested successfully.',
      sensorRecord: record,
      digitalTwinState: twinState,
    });
  } catch (error: any) {
    logger.error(`Error ingesting sensor data: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSensorHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    const history = await prisma.sensorData.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    res.status(200).json({ success: true, history });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
