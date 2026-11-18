import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';

// Patient-scoped in-memory cache for digital twin state (5-min TTL)
interface CachedTwinState {
  state: any;
  cachedAt: number;
}
const digitalTwinCache = new Map<string, CachedTwinState>();
const TWIN_CACHE_TTL_MS = 5 * 60 * 1000;

export function invalidateDigitalTwinCache(userId: string) {
  digitalTwinCache.delete(userId);
}

export function getCachedDigitalTwinState(userId: string) {
  const cached = digitalTwinCache.get(userId);
  if (cached && (Date.now() - cached.cachedAt) < TWIN_CACHE_TTL_MS) {
    return cached.state;
  }
  return null;
}

export async function updateDigitalTwinState(
  userId: string,
  newData?: Partial<{
    heartRate: number;
    hrv: number;
    systolicBP: number;
    diastolicBP: number;
    spo2: number;
    activityMins: number;
    sleepHours: number;
    ecgStatus: string;
    isSimulated: boolean;
  }>,
  preloadedContext?: {
    latestPrediction?: any;
    previousPrediction?: any;
    existingState?: any;
  }
) {
  try {
    let existing = preloadedContext?.existingState;
    if (!existing) {
      existing = await prisma.digitalTwinState.findUnique({
        where: { userId },
      });
    }

    let latestPrediction = preloadedContext?.latestPrediction;
    let previousPrediction = preloadedContext?.previousPrediction;

    // Only query database if predictions were not preloaded by the caller
    if (latestPrediction === undefined) {
      const recentPredictions = await prisma.prediction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: { factors: true },
        take: 2,
      });

      latestPrediction = recentPredictions[0] || null;
      previousPrediction = recentPredictions[1] || null;
    }

    const currentF = latestPrediction?.factors;
    const prevF = previousPrediction?.factors;

    const hr = newData?.heartRate ?? currentF?.heartRate ?? existing?.heartRate ?? 72;
    const sys = newData?.systolicBP ?? currentF?.systolicBP ?? existing?.systolicBP ?? 120;
    const dia = newData?.diastolicBP ?? currentF?.diastolicBP ?? existing?.diastolicBP ?? 80;
    const spo2Val = newData?.spo2 ?? existing?.spo2 ?? 98.0;
    const hrvVal = newData?.hrv ?? existing?.hrv ?? 45.0;
    const actMins = newData?.activityMins ?? (currentF?.exerciseFrequency ? currentF.exerciseFrequency * 30 : (existing?.activityMins ?? 30));
    const sleep = newData?.sleepHours ?? currentF?.sleepDuration ?? existing?.sleepHours ?? 7.5;
    const ecg = newData?.ecgStatus ?? currentF?.ecgResult ?? existing?.ecgStatus ?? 'NORMAL';

    const riskScore = latestPrediction?.riskScore ?? existing?.riskScore ?? 15.0;
    const riskLevel = latestPrediction?.riskLevel ?? existing?.riskLevel ?? 'LOW';

    // Calculate longitudinal measurement comparisons with safe handling of missing values
    const buildMetricComparison = (
      name: string,
      currentVal: number | null | undefined,
      prevVal: number | null | undefined,
      unit: string
    ) => {
      if (currentVal == null) return null;
      if (prevVal == null) {
        return {
          metric: name,
          current: currentVal,
          previous: null,
          delta: null,
          unit,
          trend: 'BASELINE' as const,
          description: 'Initial measurement recorded'
        };
      }
      const delta = Math.round((currentVal - prevVal) * 10) / 10;
      let trend: 'IMPROVED' | 'WORSENED' | 'STABLE';
      if (Math.abs(delta) < 0.1) {
        trend = 'STABLE';
      } else {
        trend = delta < 0 ? 'IMPROVED' : 'WORSENED';
      }
      return {
        metric: name,
        current: currentVal,
        previous: prevVal,
        delta,
        unit,
        trend,
        description: `${trend === 'IMPROVED' ? 'Favorable reduction' : trend === 'WORSENED' ? 'Elevated increase' : 'Stable reading'} of ${Math.abs(delta)} ${unit}`
      };
    };

    const longitudinalComparisons = [
      buildMetricComparison('Systolic Blood Pressure', sys, prevF?.systolicBP, 'mmHg'),
      buildMetricComparison('Diastolic Blood Pressure', dia, prevF?.diastolicBP, 'mmHg'),
      buildMetricComparison('Total Cholesterol', currentF?.cholesterol, prevF?.cholesterol, 'mg/dL'),
      buildMetricComparison('Blood Glucose', currentF?.bloodSugar, prevF?.bloodSugar, 'mg/dL'),
      buildMetricComparison('Resting Heart Rate', hr, prevF?.heartRate, 'bpm'),
      buildMetricComparison('Body Mass Index (BMI)', currentF?.bmi, prevF?.bmi, 'kg/m²'),
      buildMetricComparison('Cardiovascular Risk Score', riskScore, previousPrediction?.riskScore, '%'),
    ].filter(Boolean);

    // Derive deterministic digital twin visual state
    let condition: 'NORMAL' | 'CORONARY_FLOW_RISK' | 'ARRHYTHMIA_RISK' | 'REDUCED_CARDIAC_FUNCTION' = 'NORMAL';
    let beatMode: 'NORMAL' | 'IRREGULAR' | 'WEAK' = 'NORMAL';
    let flowMode: 'NORMAL' | 'REDUCED' | 'TURBULENT' = 'NORMAL';
    let contractionStrength = 1.0;
    let highlightRegion: 'CORONARY' | 'HEART' | null = null;
    let ecgMode: 'NORMAL' | 'IRREGULAR' | 'WEAK' | 'LV_HYPERTROPHY' = 'NORMAL';
    let explanation = 'Digital Twin hemodynamics synchronized to patient baseline.';
    let patientExplanation = 'Your cardiovascular digital twin is operating in baseline synchronized mode with balanced myocardial perfusion.';

    if (ecg === 'ST_T_ABNORMAL' || hr >= 105 || hr <= 50) {
      condition = 'ARRHYTHMIA_RISK';
      beatMode = 'IRREGULAR';
      flowMode = 'TURBULENT';
      contractionStrength = 0.95;
      ecgMode = 'IRREGULAR';
      highlightRegion = 'HEART';
      explanation = 'Heart rate and electrophysiological signals show rhythm irregularity.';
      patientExplanation = 'Your twin is showing intermittent beat variations aligned with your heart rate and rhythm readings.';
    } else if (riskScore >= 70 || currentF?.chestPainType === 'TYPICAL' || ecg === 'LV_HYPERTROPHY') {
      condition = 'REDUCED_CARDIAC_FUNCTION';
      beatMode = 'WEAK';
      flowMode = 'REDUCED';
      contractionStrength = 0.62;
      ecgMode = ecg === 'LV_HYPERTROPHY' ? 'LV_HYPERTROPHY' : 'WEAK';
      highlightRegion = 'HEART';
      explanation = 'Composite clinical risk and biomarkers indicate reduced myocardial pumping compliance.';
      patientExplanation = 'Your digital twin visualizes decreased contraction amplitude reflecting elevated cardiac strain.';
    } else if (sys >= 140 || (currentF?.cholesterol && currentF.cholesterol >= 240) || currentF?.smoking || riskScore >= 35) {
      condition = 'CORONARY_FLOW_RISK';
      beatMode = 'NORMAL';
      flowMode = 'REDUCED';
      contractionStrength = 0.92;
      highlightRegion = 'CORONARY';
      explanation = 'Elevated vascular resistance and lipid indicators highlight coronary perfusion risk.';
      patientExplanation = 'Your twin highlights coronary arterial perfusion regions due to elevated blood pressure or lipid values.';
    }

    // Distinguish recorded measurements from unmeasured parameters (never treat null as zero)
    const supportedLabs = [
      { key: 'systolicBP', label: 'Systolic Blood Pressure' },
      { key: 'diastolicBP', label: 'Diastolic Blood Pressure' },
      { key: 'cholesterol', label: 'Total Cholesterol' },
      { key: 'bloodSugar', label: 'Blood Glucose' },
      { key: 'heartRate', label: 'Resting Heart Rate' },
      { key: 'bmi', label: 'Body Mass Index (BMI)' },
      { key: 'exerciseFrequency', label: 'Exercise Frequency' },
    ];

    const availableMeasurements = supportedLabs
      .filter((lab) => currentF && (currentF as any)[lab.key] != null)
      .map((lab) => ({ metric: lab.label, value: (currentF as any)[lab.key] }));

    const missingMeasurements = [
      { metric: 'HDL Cholesterol', status: 'UNAVAILABLE_PENDING_LAB' },
      { metric: 'LDL Cholesterol', status: 'UNAVAILABLE_PENDING_LAB' },
      { metric: 'Triglycerides', status: 'UNAVAILABLE_PENDING_LAB' },
      { metric: 'HbA1c', status: 'UNAVAILABLE_PENDING_LAB' },
      { metric: 'Ejection Fraction (%)', status: 'UNAVAILABLE_PENDING_ECHO' },
      { metric: 'Serum Creatinine', status: 'UNAVAILABLE_PENDING_LAB' },
    ];

    // Data quality assessment
    let quality: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';
    let confidence = 0.95;

    if (!currentF && !newData) {
      quality = 'LOW';
      confidence = 0.65;
    } else if (spo2Val < 90 || hr < 40 || hr > 180 || sys > 200) {
      quality = 'MEDIUM';
      confidence = 0.82;
    }

    const majorFactors = {
      summaryFactors: [
        { name: 'Systolic Blood Pressure', value: `${sys} mmHg`, status: sys >= 140 ? 'HIGH' : sys >= 130 ? 'ELEVATED' : 'NORMAL' },
        { name: 'Resting Heart Rate', value: `${hr} bpm`, status: hr >= 90 ? 'HIGH' : hr <= 55 ? 'LOW' : 'NORMAL' },
        { name: 'Blood Oxygen (SpO2)', value: `${spo2Val}%`, status: spo2Val < 95 ? 'ATTENTION' : 'OPTIMAL' },
        { name: 'Heart Rate Variability', value: `${hrvVal} ms`, status: hrvVal < 30 ? 'LOW' : 'HEALTHY' },
      ],
      longitudinalComparison: longitudinalComparisons,
      visualCondition: {
        condition,
        severity: riskLevel,
        confidence,
        beatMode,
        contractionStrength,
        flowMode,
        highlightRegion,
        ecgMode,
        explanation,
        patientExplanation,
        generatedAt: new Date().toISOString(),
      },
      availableMeasurements,
      missingMeasurements,
      hasLongitudinalHistory: !!previousPrediction,
      lastVisitTimestamp: latestPrediction?.createdAt?.toISOString() ?? null,
      previousVisitTimestamp: previousPrediction?.createdAt?.toISOString() ?? null,
    };

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

    digitalTwinCache.set(userId, { state, cachedAt: Date.now() });
    return state;
  } catch (error: any) {
    logger.warn(`Digital Twin state update failed: ${error.message}`);
    return null;
  }
}
