import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';

export async function updateDigitalTwinState(userId: string, newData?: Partial<{
  heartRate: number;
  hrv: number;
  systolicBP: number;
  diastolicBP: number;
  spo2: number;
  activityMins: number;
  sleepHours: number;
  ecgStatus: string;
  isSimulated: boolean;
}>) {
  try {
    const existing = await prisma.digitalTwinState.findUnique({
      where: { userId },
    });

    const latestPrediction = await prisma.prediction.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { factors: true },
    });

    const factors = latestPrediction?.factors;

    const hr = newData?.heartRate ?? factors?.heartRate ?? existing?.heartRate ?? 72;
    const sys = newData?.systolicBP ?? factors?.systolicBP ?? existing?.systolicBP ?? 120;
    const dia = newData?.diastolicBP ?? factors?.diastolicBP ?? existing?.diastolicBP ?? 80;
    const spo2Val = newData?.spo2 ?? existing?.spo2 ?? 98.0;
    const hrvVal = newData?.hrv ?? existing?.hrv ?? 45.0;
    const actMins = newData?.activityMins ?? factors?.exerciseFrequency ? (factors!.exerciseFrequency * 30) : (existing?.activityMins ?? 30);
    const sleep = newData?.sleepHours ?? factors?.sleepDuration ?? existing?.sleepHours ?? 7.5;
    const ecg = newData?.ecgStatus ?? factors?.ecgResult ?? existing?.ecgStatus ?? 'NORMAL';

    const riskScore = latestPrediction?.riskScore ?? existing?.riskScore ?? 15.0;
    const riskLevel = latestPrediction?.riskLevel ?? existing?.riskLevel ?? 'LOW';

    // Calculate overall data quality & confidence
    let quality: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';
    let confidence = 0.95;

    if (!factors && !newData) {
      quality = 'LOW';
      confidence = 0.65;
    } else if (spo2Val < 90 || hr < 40 || hr > 180 || sys > 200) {
      quality = 'MEDIUM'; // Outlier readings reduce confidence rating
      confidence = 0.82;
    }

    const majorFactors = [
      { name: 'Systolic Blood Pressure', value: `${sys} mmHg`, status: sys >= 140 ? 'HIGH' : sys >= 130 ? 'ELEVATED' : 'NORMAL' },
      { name: 'Resting Heart Rate', value: `${hr} bpm`, status: hr >= 90 ? 'HIGH' : hr <= 55 ? 'LOW' : 'NORMAL' },
      { name: 'Blood Oxygen (SpO2)', value: `${spo2Val}%`, status: spo2Val < 95 ? 'ATTENTION' : 'OPTIMAL' },
      { name: 'Heart Rate Variability', value: `${hrvVal} ms`, status: hrvVal < 30 ? 'LOW' : 'HEALTHY' },
    ];

    const state = await prisma.digitalTwinState.upsert({
      where: { userId },
      update: {
        heartRate: hr,
        hrv: hrvVal,
        systolicBP: sys,
        diastolicBP: dia,
        spo2: spo2Val,
        activityMins: actMins,
        sleepHours: sleep,
        ecgStatus: ecg,
        riskScore,
        riskLevel,
        majorFactors: majorFactors as any,
        dataQuality: quality,
        confidenceScore: confidence,
        isSimulated: newData?.isSimulated ?? existing?.isSimulated ?? false,
        lastUpdated: new Date(),
      },
      create: {
        userId,
        heartRate: hr,
        hrv: hrvVal,
        systolicBP: sys,
        diastolicBP: dia,
        spo2: spo2Val,
        activityMins: actMins,
        sleepHours: sleep,
        ecgStatus: ecg,
        riskScore,
        riskLevel,
        majorFactors: majorFactors as any,
        dataQuality: quality,
        confidenceScore: confidence,
        isSimulated: newData?.isSimulated ?? false,
      },
    });

    return state;
  } catch (error: any) {
    logger.warn(`Digital Twin state update failed: ${error.message}`);
    return null;
  }
}
