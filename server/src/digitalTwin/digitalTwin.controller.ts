import { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { updateDigitalTwinState } from '../services/digitalTwinService.js';
import { createAuditLogEntry } from '../services/hashChainService.js';

export const getDigitalTwinState = async (req: Request, res: Response) => {
  try {
    const authUserId = (req as AuthRequest).user?.id;
    const { patientId } = req.params;

    const targetUserId = (patientId as string) || (authUserId as string);

    if (!targetUserId) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    let state = await prisma.digitalTwinState.findUnique({
      where: { userId: targetUserId },
    });

    if (!state) {
      state = await updateDigitalTwinState(targetUserId);
    }

    res.status(200).json({
      success: true,
      digitalTwin: state,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const simulateSensorStream = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    // Generate random realistic variation for presentation demo
    const simulatedHR = 65 + Math.floor(Math.random() * 30);
    const simulatedSys = 118 + Math.floor(Math.random() * 35);
    const simulatedDia = 75 + Math.floor(Math.random() * 20);
    const simulatedSpo2 = parseFloat((96.5 + Math.random() * 3.0).toFixed(1));
    const simulatedHrv = parseFloat((35.0 + Math.random() * 30.0).toFixed(1));

    const state = await updateDigitalTwinState(userId, {
      heartRate: simulatedHR,
      systolicBP: simulatedSys,
      diastolicBP: simulatedDia,
      spo2: simulatedSpo2,
      hrv: simulatedHrv,
      isSimulated: true,
    });

    await createAuditLogEntry({
      userId,
      patientId: userId,
      eventType: 'DIGITAL_TWIN_SIMULATION',
      action: 'TRIGGER_SIMULATED_SENSOR_STREAM',
      details: `Executed 5-minute simulated physiological stream tick. HR: ${simulatedHR} bpm, BP: ${simulatedSys}/${simulatedDia} mmHg, SpO2: ${simulatedSpo2}%. [SIMULATED DATA]`,
    });

    res.status(200).json({
      success: true,
      message: 'Simulated 5-minute sensor stream payload processed. State updated.',
      isSimulated: true,
      digitalTwin: state,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
