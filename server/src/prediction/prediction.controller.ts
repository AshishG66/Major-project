import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { logger } from '../config/logger.js';
import { buildReportPdf } from '../utils/pdf.js';
import { eventBus, EVENTS } from '../utils/eventBus.js';
import { createAuditLogEntry } from '../services/hashChainService.js';
import { updateDigitalTwinState, invalidateDigitalTwinCache, getCachedDigitalTwinState } from '../services/digitalTwinService.js';
import { checkAndTriggerAlerts } from '../services/alertService.js';
import { generatePersonalizedPreventionPlan, generateFallbackPreventionPlan } from '../services/preventionService.js';
import { backgroundQueue } from '../utils/backgroundQueue.js';
import { invalidatePatientContextCache } from '../services/aiOrchestrator.js';
import { extractClinicalReport } from '../services/clinicalReportExtractionService.js';
import { calculateValidationMetrics, registerValidationCase, buildValidationReportPdf } from '../services/clinicalValidationService.js';
import { analyzeClinicalReportFile, executeClinicalReportPrediction } from '../services/clinicalReport/index.js';

export const getAiServiceUrl = () => {
  const envUrl = process.env.AI_SERVICE_URL || process.env.FASTAPI_URL;
  if (envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))) {
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  }
  if (envUrl === 'hridayadarpana-ai' || envUrl === 'http://hridayadarpana-ai') {
    return 'https://hridayadarpana-ai.onrender.com';
  }
  return 'https://hridayadarpana-ai.onrender.com';
};

export const predictionInputSchema = z.object({
  age: z.number().int().nonnegative(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  height: z.number().positive(),
  weight: z.number().positive(),
  systolicBP: z.number().int().positive(),
  diastolicBP: z.number().int().positive(),
  cholesterol: z.number().int().positive(),
  heartRate: z.number().int().positive(),
  bloodSugar: z.number().int().positive(),
  ecgResult: z.enum(['NORMAL', 'ST_T_ABNORMAL', 'LV_HYPERTROPHY']),
  exerciseFrequency: z.number().int().min(0).max(7),
  smoking: z.boolean(),
  alcohol: z.boolean(),
  diabetes: z.boolean(),
  familyHistory: z.boolean(),
  chestPainType: z.enum(['TYPICAL', 'ATYPICAL', 'NON_ANGINAL', 'ASYMPTOMATIC']),
  sleepDuration: z.number().min(0).max(24),
  stressLevel: z.number().int().min(1).max(10),
});

export function calculateClinicalFallbackRisk(factors: any, bmi: number) {
  let score = 10;

  if (factors.age > 65) score += 25;
  else if (factors.age > 50) score += 15;
  else if (factors.age > 40) score += 8;

  if (factors.systolicBP >= 160) score += 25;
  else if (factors.systolicBP >= 140) score += 18;
  else if (factors.systolicBP >= 130) score += 10;

  if (factors.diastolicBP >= 100) score += 15;
  else if (factors.diastolicBP >= 90) score += 8;

  if (factors.cholesterol >= 240) score += 20;
  else if (factors.cholesterol >= 200) score += 10;

  if (factors.bloodSugar >= 126) score += 15;
  else if (factors.bloodSugar >= 100) score += 5;

  if (bmi >= 30) score += 12;
  else if (bmi >= 25) score += 6;

  if (factors.heartRate >= 90) score += 8;

  if (factors.ecgResult === 'LV_HYPERTROPHY') score += 22;
  else if (factors.ecgResult === 'ST_T_ABNORMAL') score += 14;

  if (factors.chestPainType === 'TYPICAL') score += 25;
  else if (factors.chestPainType === 'ATYPICAL') score += 15;
  else if (factors.chestPainType === 'NON_ANGINAL') score += 5;

  if (factors.smoking) score += 18;
  if (factors.diabetes) score += 18;
  if (factors.familyHistory) score += 12;
  if (factors.alcohol) score += 5;

  if (factors.stressLevel >= 8) score += 10;
  else if (factors.stressLevel >= 6) score += 5;

  if (factors.exerciseFrequency >= 4) score -= 12;
  else if (factors.exerciseFrequency >= 2) score -= 6;

  const riskScore = Math.max(5, Math.min(95, Math.round(score)));

  let riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  if (riskScore >= 75) riskLevel = 'CRITICAL';
  else if (riskScore >= 50) riskLevel = 'HIGH';
  else if (riskScore >= 25) riskLevel = 'MODERATE';
  else riskLevel = 'LOW';

  const plainExplanation = `[HEURISTIC CLINICAL FALLBACK] Cardiovascular risk score calculated at ${riskScore}% (${riskLevel} Risk category) using rule-based triage. Primary contributing metrics include blood pressure (${factors.systolicBP}/${factors.diastolicBP} mmHg), cholesterol (${factors.cholesterol} mg/dL), and clinical lifestyle parameters. AI microservice is offline.`;

  return {
    riskScore,
    riskLevel,
    isMlPrediction: false,
    modelName: 'Clinical Decision Rules Heuristic (AI Microservice Offline)',
    modelVersion: 'v2.1-ClinicalHeuristicFallback',
    confidenceScore: 0.0,
    featureImportance: [],
    explanationStatus: 'EXPLANATION_UNAVAILABLE',
    clinicalSummary: plainExplanation,
    fallbackNotice: 'AI prediction service offline. Score generated via rule-based clinical heuristic triage, NOT statistical machine learning model.'
  };
}

export async function executePredictionCore(
  validUserId: string,
  factors: z.infer<typeof predictionInputSchema>,
  onStage?: (stage: { stage: string; step: number; text: string }) => void
) {
  // Stage 1: Biometric Validation & Preprocessing
  onStage?.({ stage: 'VALIDATING', step: 1, text: 'Validating patient biometric information...' });

  const bmi = parseFloat((factors.weight / ((factors.height / 100) ** 2)).toFixed(1));
  const genderInt = factors.gender === 'MALE' ? 0 : 1;
  const ecgInt = factors.ecgResult === 'NORMAL' ? 0 : factors.ecgResult === 'ST_T_ABNORMAL' ? 1 : 2;
  const chestPainInt = factors.chestPainType === 'TYPICAL' ? 0 : factors.chestPainType === 'ATYPICAL' ? 1 : factors.chestPainType === 'NON_ANGINAL' ? 2 : 3;

  // Stage 2: Historical Longitudinal Visits Retrieval
  onStage?.({ stage: 'FETCHING_HISTORY', step: 2, text: 'Retrieving longitudinal clinical history & prior visits...' });

  let historyPayload: Array<{
    systolicBP: number;
    diastolicBP: number;
    cholesterol: number;
    bloodSugar: number;
    heartRate: number;
    bmi: number;
    timestamp: string;
  }> = [];

  let pastPredictions: any[] = [];
  try {
    const rawPast = await prisma.prediction.findMany({
      where: { userId: validUserId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        createdAt: true,
        riskScore: true,
        riskLevel: true,
        factors: {
          select: {
            systolicBP: true,
            diastolicBP: true,
            cholesterol: true,
            bloodSugar: true,
            heartRate: true,
            bmi: true,
            ecgResult: true,
            exerciseFrequency: true,
            sleepDuration: true,
            smoking: true,
          },
        },
      },
    });

    pastPredictions = rawPast.slice().reverse();

    historyPayload = pastPredictions
      .filter((p) => p.factors !== null)
      .map((p) => ({
        systolicBP: p.factors!.systolicBP,
        diastolicBP: p.factors!.diastolicBP,
        cholesterol: p.factors!.cholesterol,
        bloodSugar: p.factors!.bloodSugar,
        heartRate: p.factors!.heartRate,
        bmi: p.factors!.bmi,
        timestamp: p.createdAt.toISOString(),
      }));
  } catch (histErr: any) {
    logger.warn(`Could not fetch prior patient visits for LSTM sequence: ${histErr.message}`);
  }

  // Stage 3: Running Hybrid ML Prediction
  onStage?.({ stage: 'RUNNING_MODEL', step: 3, text: 'Executing hybrid XGBoost-LSTM risk models...' });

  const fastApiPayload = {
    age: factors.age,
    gender: genderInt,
    height: factors.height,
    weight: factors.weight,
    bmi,
    systolicBP: factors.systolicBP,
    diastolicBP: factors.diastolicBP,
    cholesterol: factors.cholesterol,
    heartRate: factors.heartRate,
    bloodSugar: factors.bloodSugar,
    ecgResult: ecgInt,
    exerciseFrequency: factors.exerciseFrequency,
    smoking: factors.smoking ? 1 : 0,
    alcohol: factors.alcohol ? 1 : 0,
    diabetes: factors.diabetes ? 1 : 0,
    familyHistory: factors.familyHistory ? 1 : 0,
    chestPainType: chestPainInt,
    sleepDuration: factors.sleepDuration,
    stressLevel: factors.stressLevel,
    history: historyPayload,
  };

  const primaryUrl = getAiServiceUrl();
  const candidateUrls = [primaryUrl];
  if (primaryUrl.includes('onrender.com')) {
    candidateUrls.push('http://localhost:8000');
  } else if (!primaryUrl.includes('onrender.com')) {
    candidateUrls.push('https://hridayadarpana-ai.onrender.com');
  }

  let predictionRes: any = null;
  for (const url of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const response = await fetch(`${url}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fastApiPayload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        predictionRes = await response.json();
        break;
      }
      logger.warn(`AI Service at ${url} returned status ${response.status}`);
    } catch (err: any) {
      logger.warn(`AI microservice at ${url} unreachable or timed out (${err.message}).`);
    }
  }

  if (!predictionRes) {
    logger.warn('All AI microservice endpoints unreachable. Engaging HridyaDarpan Clinical Risk Engine fallback.');
    predictionRes = calculateClinicalFallbackRisk(factors, bmi);
  }

  const recs = predictionRes.recommendations || {
    diet: ["Maintain DASH / Mediterranean diet low in saturated fats and refined sugars.", "Restrict daily sodium intake to under 1,500 - 2,000 mg."],
    exercise: ["Engage in 150 minutes of moderate-intensity aerobic exercise weekly."],
    lifestyle: ["Target 7-8 hours of restful sleep daily.", "Schedule annual lipid profiles and ECG screenings."],
    weeklyGoal: "Complete 150 minutes of light active exercise.",
  };

  // Stage 4: Calculating Explainability & SHAP Attributions
  onStage?.({ stage: 'EXPLAINABILITY', step: 4, text: 'Calculating Tree-SHAP drivers and attention weights...' });

  const healthScoreVal = Math.max(10, Math.min(100, Math.round(100 - predictionRes.riskScore)));
  const shapExplanationData = predictionRes.featureImportance || predictionRes.contributions || [];
  const plainExplanationText = predictionRes.clinicalSummary || predictionRes.plainExplanation || `Risk evaluated as ${predictionRes.riskLevel} (${predictionRes.riskScore}%).`;
  const confidenceVal = predictionRes.isMlPrediction === false ? 0.0 : (predictionRes.predictionConfidence ?? 0.0);

  const risk30Day: number | null = null;
  const risk1Year: number | null = null;
  const risk5Year: number | null = null;
  const modelVersionStr = predictionRes.modelVersion || (predictionRes.isMlPrediction === false ? 'v2.1-HeuristicFallback' : 'v2.1-HonestOrchestrator');

  const horizonConfidence = {
    day30: { available: false, status: 'UNSUPPORTED', note: 'Requires longitudinal survival cohort data' },
    year1: { available: false, status: 'UNSUPPORTED', note: 'Requires longitudinal survival cohort data' },
    year5: { available: false, status: 'UNSUPPORTED', note: 'Requires longitudinal survival cohort data' },
    hybridModel: predictionRes.hybridModel || null,
    hybridStatus: predictionRes.hybridStatus || 'INACTIVE',
    fusionStrategy: predictionRes.fusionStrategy || null,
    mcConfidenceInterval95: predictionRes.mcConfidenceInterval95 || null,
    dataCompleteness: predictionRes.dataCompleteness || null,
  };

  // Stage 5: Updating Digital Twin & Batched Transaction Persistence
  onStage?.({ stage: 'DIGITAL_TWIN', step: 5, text: 'Updating Digital Twin physiological state...' });

  const [pred] = await Promise.all([
    prisma.prediction.create({
      data: {
        userId: validUserId,
        riskScore: predictionRes.riskScore,
        riskLevel: predictionRes.riskLevel,
        confidenceScore: confidenceVal,
        modelName: predictionRes.modelName || (predictionRes.isMlPrediction === false ? 'Clinical Decision Rules Heuristic (Offline)' : 'Verified ML Ensemble'),
        shapExplanation: shapExplanationData as any,
        plainExplanation: plainExplanationText,
        risk30Day,
        risk1Year,
        risk5Year,
        modelVersion: modelVersionStr,
        horizonConfidence: horizonConfidence as any,
        factors: {
          create: {
            age: factors.age,
            gender: factors.gender,
            height: factors.height,
            weight: factors.weight,
            bmi,
            systolicBP: factors.systolicBP,
            diastolicBP: factors.diastolicBP,
            cholesterol: factors.cholesterol,
            heartRate: factors.heartRate,
            bloodSugar: factors.bloodSugar,
            ecgResult: factors.ecgResult,
            exerciseFrequency: factors.exerciseFrequency,
            smoking: factors.smoking,
            alcohol: factors.alcohol,
            diabetes: factors.diabetes,
            familyHistory: factors.familyHistory,
            chestPainType: factors.chestPainType,
            sleepDuration: factors.sleepDuration,
            stressLevel: factors.stressLevel,
          },
        },
      },
      include: {
        factors: true,
      },
    }),
    prisma.healthScore.create({
      data: {
        userId: validUserId,
        score: healthScoreVal,
        cardioIndex: parseFloat((100 - predictionRes.riskScore * 0.8).toFixed(1)),
      },
    }),
  ]);

  // Invalidate patient context cache immediately
  invalidatePatientContextCache(validUserId);

  // Update Digital Twin state with preloaded predictions (eliminates duplicate queries & utilizes memory cache)
  const twinStatePromise = updateDigitalTwinState(
    validUserId,
    {
      heartRate: factors.heartRate,
      systolicBP: factors.systolicBP,
      diastolicBP: factors.diastolicBP,
      ecgStatus: factors.ecgResult,
      activityMins: factors.exerciseFrequency * 30,
      sleepHours: factors.sleepDuration,
    },
    {
      latestPrediction: pred,
      previousPrediction: pastPredictions[pastPredictions.length - 1] || null,
    }
  ).catch((err: any) => {
    logger.warn(`Digital Twin update deferred: ${err.message}`);
    return getCachedDigitalTwinState(validUserId);
  });

  // Stage 6: Preparing Report & Clinical Prevention Plan
  onStage?.({ stage: 'PREPARING_REPORT', step: 6, text: 'Preparing clinical recommendations & prevention plan...' });

  const personalizedPreventionPlan = generatePersonalizedPreventionPlan(
    validUserId,
    pred,
    factors
  );

  // Background non-blocking deferred writes using reliable queue with retry propagation
  backgroundQueue.enqueue(
    `plans_persist_${pred.id}`,
    async () => {
      // Execute atomically in a batch transaction for Neon PgBouncer
      await prisma.$transaction([
        prisma.dietPlan.updateMany({
          where: { userId: validUserId, isActive: true },
          data: { isActive: false },
        }),
        prisma.exercisePlan.updateMany({
          where: { userId: validUserId, isActive: true },
          data: { isActive: false },
        }),
        prisma.dietPlan.create({
          data: {
            userId: validUserId,
            calories: factors.gender === 'MALE' ? 2200 : 1800,
            macroCarbs: 220,
            macroPro: 90,
            macroFat: 60,
            planData: (recs.diet || recs) as any,
            isActive: true,
          },
        }),
        prisma.exercisePlan.create({
          data: {
            userId: validUserId,
            targetMins: factors.exerciseFrequency * 30 || 150,
            planData: (recs.exercise || recs) as any,
            isActive: true,
          },
        }),
      ]);
    },
    {
      maxRetries: 2,
      onError: (err, attempt, exhausted) => {
        if (exhausted) {
          logger.error(`[BackgroundQueue] Plan persistence permanently failed for prediction ${pred.id} after ${attempt} retries: ${err.message}`);
        }
      },
    }
  );

  backgroundQueue.enqueue(
    `alerts_check_${pred.id}`,
    async () => {
      await checkAndTriggerAlerts(
        {
          userId: validUserId,
          riskLevel: predictionRes.riskLevel,
          riskScore: predictionRes.riskScore,
          systolicBP: factors.systolicBP,
          diastolicBP: factors.diastolicBP,
          heartRate: factors.heartRate,
          factors,
        },
        { throwOnError: true }
      );
    },
    {
      maxRetries: 2,
      onError: (err, attempt, exhausted) => {
        if (exhausted) {
          logger.error(`[BackgroundQueue] Alert threshold check permanently failed for prediction ${pred.id} after ${attempt} retries: ${err.message}`);
        }
      },
    }
  );

  backgroundQueue.enqueue(
    `audit_prediction_${pred.id}`,
    async () => {
      const log = await createAuditLogEntry(
        {
          userId: validUserId,
          patientId: validUserId,
          eventType: 'RUN_PREDICTION',
          action: 'EXECUTE_CARDIAC_PREDICTION',
          details: `Executed multi-horizon cardiac risk prediction. Risk: ${predictionRes.riskLevel} (${predictionRes.riskScore}%), Model Version: ${modelVersionStr}.`,
        },
        { throwOnError: true }
      );
      if (!log) {
        throw new Error('Audit log creation failed to persist record to database');
      }
    },
    {
      maxRetries: 3,
      onError: (err, attempt, exhausted) => {
        if (exhausted) {
          logger.error(`[AUDIT_CRITICAL_FAILURE] Routine prediction audit log for prediction ${pred.id} permanently failed after ${attempt} retries: ${err.message}`);
        }
      },
    }
  );

  eventBus.emit(EVENTS.PREDICTION_CREATED, {
    userId: validUserId,
    prediction: pred,
    healthScore: healthScoreVal,
  });

  await twinStatePromise;

  return {
    success: true,
    prediction: {
      id: pred.id,
      riskLevel: pred.riskLevel,
      riskScore: pred.riskScore,
      risk30Day,
      risk1Year,
      risk5Year,
      modelVersion: modelVersionStr,
      horizonConfidence,
      confidenceScore: confidenceVal,
      shapExplanation: shapExplanationData,
      createdAt: pred.createdAt,
      factors: {
        age: factors.age,
        gender: factors.gender,
        height: factors.height,
        weight: factors.weight,
        bmi,
        systolicBP: factors.systolicBP,
        diastolicBP: factors.diastolicBP,
        cholesterol: factors.cholesterol,
        heartRate: factors.heartRate,
        bloodSugar: factors.bloodSugar,
        ecgResult: factors.ecgResult,
        exerciseFrequency: factors.exerciseFrequency,
        smoking: factors.smoking,
        alcohol: factors.alcohol,
        diabetes: factors.diabetes,
        familyHistory: factors.familyHistory,
        chestPainType: factors.chestPainType,
        sleepDuration: factors.sleepDuration,
        stressLevel: factors.stressLevel,
      },
      hybridModel: predictionRes.hybridModel || null,
      hybridStatus: predictionRes.hybridStatus || 'INACTIVE',
      fusionStrategy: predictionRes.fusionStrategy || null,
      mcConfidenceInterval95: predictionRes.mcConfidenceInterval95 || null,
      dataCompleteness: predictionRes.dataCompleteness || null,
    },
    healthScore: healthScoreVal,
    recommendations: recs,
    preventionPlan: personalizedPreventionPlan,
  };
}

export const createPrediction = async (req: Request, res: Response) => {
  try {
    const caller = (req as AuthRequest).user;
    if (!caller?.id) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }
    const parsed = predictionInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.format(),
      });
    }

    const result = await executePredictionCore(caller.id, parsed.data);
    res.status(200).json(result);
  } catch (error: any) {
    logger.error(`Error creating prediction: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createPredictionStream = async (req: Request, res: Response) => {
  const caller = (req as AuthRequest).user;
  if (!caller?.id) {
    return res.status(401).json({ success: false, message: 'Unauthenticated' });
  }
  const parsed = predictionInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: parsed.error.format(),
    });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const result = await executePredictionCore(caller.id, parsed.data, (stage) => {
      res.write(`data: ${JSON.stringify(stage)}\n\n`);
    });

    res.write(`data: ${JSON.stringify({ stage: 'COMPLETE', step: 7, text: 'Scan complete', result })}\n\n`);
    res.end();
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ stage: 'ERROR', error: err.message })}\n\n`);
    res.end();
  }
};

import { canAccessPatientRecords } from '../services/accessControlService.js';

export const getHistory = async (req: Request, res: Response) => {
  try {
    const caller = (req as AuthRequest).user;
    if (!caller?.id) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    const targetUserId = (req.query.patientId as string) || caller.id;
    if (targetUserId !== caller.id) {
      const access = await canAccessPatientRecords(caller, targetUserId, 'PREDICTION_HISTORY');
      if (!access.authorized) {
        return res.status(access.status).json({ success: false, message: access.reason });
      }
    }

    const history = await prisma.prediction.findMany({
      where: { userId: targetUserId },
      orderBy: { createdAt: 'desc' },
      include: { factors: true },
      take: 20,
    });

    res.status(200).json({
      success: true,
      history,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getLatestPrediction = async (req: Request, res: Response) => {
  try {
    const caller = (req as AuthRequest).user;
    if (!caller?.id) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    const targetUserId = (req.query.patientId as string) || caller.id;
    if (targetUserId !== caller.id) {
      const access = await canAccessPatientRecords(caller, targetUserId, 'LATEST_PREDICTION');
      if (!access.authorized) {
        return res.status(access.status).json({ success: false, message: access.reason });
      }
    }

    const latest = await prisma.prediction.findFirst({
      where: { userId: targetUserId },
      orderBy: { createdAt: 'desc' },
      include: { factors: true },
    });

    const activeDiet = await prisma.dietPlan.findFirst({
      where: { userId: targetUserId, isActive: true },
    });

    const activeExercise = await prisma.exercisePlan.findFirst({
      where: { userId: targetUserId, isActive: true },
    });

    const latestHealthScore = await prisma.healthScore.findFirst({
      where: { userId: targetUserId },
      orderBy: { createdAt: 'desc' },
    });

    const preventionPlan = latest && latest.factors
      ? generatePersonalizedPreventionPlan(targetUserId, latest, latest.factors)
      : generateFallbackPreventionPlan(targetUserId);

    res.status(200).json({
      success: true,
      prediction: latest,
      dietPlan: activeDiet,
      exercisePlan: activeExercise,
      healthScore: latestHealthScore?.score || null,
      preventionPlan,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPreventionPlan = async (req: Request, res: Response) => {
  try {
    const caller = (req as AuthRequest).user;
    if (!caller?.id) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    const targetUserId = (req.query.patientId as string) || caller.id;
    if (targetUserId !== caller.id) {
      const access = await canAccessPatientRecords(caller, targetUserId, 'PREVENTION_PLAN');
      if (!access.authorized) {
        return res.status(access.status).json({ success: false, message: access.reason });
      }
    }

    const latest = await prisma.prediction.findFirst({
      where: { userId: targetUserId },
      orderBy: { createdAt: 'desc' },
      include: { factors: true },
    });

    const preventionPlan = latest && latest.factors
      ? generatePersonalizedPreventionPlan(targetUserId, latest, latest.factors)
      : generateFallbackPreventionPlan(targetUserId);

    res.status(200).json({
      success: true,
      preventionPlan,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const downloadReport = async (req: Request, res: Response) => {
  try {
    const caller = (req as AuthRequest).user;
    if (!caller?.id) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    const { id } = req.params;
    const targetUserId = (req.query.patientId as string) || caller.id;

    let prediction: any = null;

    if (id === 'latest' || !id) {
      if (caller.role === 'ADMIN') {
        const access = await canAccessPatientRecords(caller, targetUserId, 'REPORT_DOWNLOAD');
        if (!access.authorized) {
          return res.status(access.status).json({ success: false, message: access.reason });
        }
      } else if (targetUserId !== caller.id) {
        const access = await canAccessPatientRecords(caller, targetUserId, 'REPORT_DOWNLOAD');
        if (!access.authorized) {
          return res.status(access.status).json({ success: false, message: access.reason });
        }
      }

      prediction = await prisma.prediction.findFirst({
        where: { userId: targetUserId },
        orderBy: { createdAt: 'desc' },
        include: { factors: true },
      });

      if (!prediction || !prediction.factors) {
        return res.status(404).json({ success: false, message: 'Report prediction not found for this patient' });
      }
    } else {
      // Specific report ID lookup (id !== 'latest' && id)
      // Enforce ownership-scoped or assignment-scoped queries (SEC-3.4-01 remediation)
      if (caller.role === 'ADMIN') {
        prediction = await prisma.prediction.findUnique({
          where: { id: id as string },
          include: { factors: true },
        });

        if (!prediction || !prediction.factors) {
          return res.status(404).json({ success: false, message: 'Report prediction not found for this patient' });
        }

        // Record administrative access audit log under institutional oversight
        const access = await canAccessPatientRecords(caller, prediction.userId, 'REPORT_DOWNLOAD');
        if (!access.authorized) {
          return res.status(access.status).json({ success: false, message: access.reason });
        }
      } else if (caller.role === 'DOCTOR') {
        if (req.query.patientId) {
          const queryPatientId = req.query.patientId as string;
          const access = await canAccessPatientRecords(caller, queryPatientId, 'REPORT_DOWNLOAD');
          if (!access.authorized) {
            return res.status(access.status).json({ success: false, message: access.reason });
          }
          prediction = await prisma.prediction.findFirst({
            where: { id: id as string, userId: queryPatientId },
            include: { factors: true },
          });
        } else {
          // Scope query strictly to patients with an ACTIVE assignment to this doctor
          const activeAssignments = await prisma.doctorPatientAssignment.findMany({
            where: { doctorId: caller.id, status: 'ACTIVE' },
            select: { patientId: true },
          });
          const assignedPatientIds = activeAssignments.map((a) => a.patientId);

          prediction = await prisma.prediction.findFirst({
            where: {
              id: id as string,
              userId: { in: assignedPatientIds },
            },
            include: { factors: true },
          });
        }

        // Return uniform 404 for unassigned/nonexistent reports to eliminate existence oracle
        if (!prediction || !prediction.factors) {
          return res.status(404).json({ success: false, message: 'Report prediction not found for this patient' });
        }
      } else {
        // Patient (USER) role: strictly ownership-scoped to caller's own records
        if (req.query.patientId && req.query.patientId !== caller.id) {
          return res.status(403).json({ success: false, message: 'Access denied. You are not authorized to view another patient\'s records.' });
        }

        prediction = await prisma.prediction.findFirst({
          where: { id: id as string, userId: caller.id },
          include: { factors: true },
        });

        // Return uniform 404 for unauthorized/nonexistent reports to eliminate existence oracle
        if (!prediction || !prediction.factors) {
          return res.status(404).json({ success: false, message: 'Report prediction not found for this patient' });
        }
      }
    }


    const user = await prisma.user.findUnique({
      where: { id: prediction.userId },
      include: { profile: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }

    // Generate patient-specific personalized prevention plan for this report
    const preventionPlan = generatePersonalizedPreventionPlan(
      prediction.userId,
      prediction,
      prediction.factors
    );

    // Query digital twin state for longitudinal telemetry in the report
    const digitalTwin = await prisma.digitalTwinState.findUnique({
      where: { userId: prediction.userId },
    });

    const dateStr = prediction.createdAt
      ? new Date(prediction.createdAt).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    const filename = `HridayaDarpana_Cardiovascular_Report_${dateStr}.pdf`;

    // Set headers for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    buildReportPdf(res, {
      user: {
        id: user.id,
        email: user.email,
        profile: user.profile,
      },
      prediction: {
        id: prediction.id,
        riskLevel: prediction.riskLevel,
        riskScore: prediction.riskScore,
        confidenceScore: prediction.confidenceScore,
        plainExplanation: prediction.plainExplanation,
        shapExplanation: prediction.shapExplanation,
        modelVersion: prediction.modelVersion || 'v3.0-Hybrid-XGBoost-LSTM',
        risk30Day: prediction.risk30Day,
        risk1Year: prediction.risk1Year,
        risk5Year: prediction.risk5Year,
        modelName: prediction.modelName,
        horizonConfidence: prediction.horizonConfidence,
        createdAt: prediction.createdAt,
      },
      factors: prediction.factors as any,
      preventionPlan,
      digitalTwinState: digitalTwin,
    });
  } catch (error: any) {
    logger.error(`Error downloading report PDF: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const extractClinicalReportController = async (req: Request, res: Response) => {
  try {
    const { fileBase64, mimeType, fileName, fileText } = req.body;
    let buffer: Buffer | null = null;
    if (fileBase64) {
      buffer = Buffer.from(fileBase64, 'base64');
    }
    const result = await extractClinicalReport(buffer, mimeType || 'application/pdf', fileName || 'report.pdf', fileText);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    logger.error(`Error in extractClinicalReportController: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Controller for Section 4-8: Clinical Report Analysis
 * Performs structured document extraction, canonical mapping,
 * segregated biomarker categorization, and model readiness validation.
 */
export const analyzeClinicalReportController = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    const { fileBase64, mimeType, fileName, fileText } = req.body;
    let buffer: Buffer | null = null;
    if (fileBase64) {
      buffer = Buffer.from(fileBase64, 'base64');
    }

    const analysis = await analyzeClinicalReportFile(
      buffer,
      mimeType || 'application/pdf',
      fileName || 'clinical_report.pdf',
      fileText
    );

    res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (err: any) {
    logger.error(`Error in analyzeClinicalReportController: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Controller for Section 9-13: Review & Prediction Execution
 * Executes verified patient clinical values through the existing 5 ML models,
 * computes SHAP explanations, updates Digital Twin, and generates Prevention Plan.
 */
export const runClinicalReportAnalysisController = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    const { caseId, reportFileName, reportDate, clinicalValues, sourceAttribution, unusedClinicalValues } = req.body;

    if (!clinicalValues) {
      return res.status(400).json({ success: false, message: 'Missing clinical values payload' });
    }

    const predictionResult = await executeClinicalReportPrediction(userId, {
      caseId: caseId || 'CASE-' + Math.floor(100000 + Math.random() * 900000),
      reportFileName: reportFileName || 'report.pdf',
      reportDate,
      clinicalValues,
      sourceAttribution,
      unusedClinicalValues,
    });

    res.status(200).json({
      success: true,
      data: predictionResult,
    });
  } catch (err: any) {
    logger.error(`Error in runClinicalReportAnalysisController: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const validateHistoricalCaseController = async (req: Request, res: Response) => {
  try {
    const { patientData, actualOutcome, reportFileName } = req.body;
    if (!patientData || !actualOutcome) {
      return res.status(400).json({ success: false, message: 'Missing patientData or actualOutcome' });
    }

    // Run prediction through existing ML pipeline
    const bmi = parseFloat((patientData.weight / ((patientData.height / 100) ** 2)).toFixed(1));
    const genderInt = patientData.gender === 'MALE' ? 0 : 1;
    const ecgInt = patientData.ecgResult === 'NORMAL' ? 0 : patientData.ecgResult === 'ST_T_ABNORMAL' ? 1 : 2;
    const chestPainInt = patientData.chestPainType === 'TYPICAL' ? 0 : patientData.chestPainType === 'ATYPICAL' ? 1 : patientData.chestPainType === 'NON_ANGINAL' ? 2 : 3;

    const fastApiPayload = {
      age: patientData.age,
      gender: genderInt,
      height: patientData.height,
      weight: patientData.weight,
      bmi,
      systolicBP: patientData.systolicBP,
      diastolicBP: patientData.diastolicBP,
      cholesterol: patientData.cholesterol,
      heartRate: patientData.heartRate,
      bloodSugar: patientData.bloodSugar,
      ecgResult: ecgInt,
      exerciseFrequency: patientData.exerciseFrequency,
      smoking: patientData.smoking ? 1 : 0,
      alcohol: patientData.alcohol ? 1 : 0,
      diabetes: patientData.diabetes ? 1 : 0,
      familyHistory: patientData.familyHistory ? 1 : 0,
      chestPainType: chestPainInt,
      sleepDuration: patientData.sleepDuration,
      stressLevel: patientData.stressLevel,
    };

    const aiServiceUrl = getAiServiceUrl();
    let predictionRes: any;
    try {
      const response = await fetch(`${aiServiceUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fastApiPayload),
      });
      if (response.ok) {
        predictionRes = await response.json();
      } else {
        predictionRes = calculateClinicalFallbackRisk(patientData, bmi);
      }
    } catch {
      predictionRes = calculateClinicalFallbackRisk(patientData, bmi);
    }

    const registeredCase = registerValidationCase({
      reportFileName,
      demographics: {
        age: patientData.age,
        gender: patientData.gender === 'MALE' ? 'MALE' : 'FEMALE',
        systolicBP: patientData.systolicBP,
        diastolicBP: patientData.diastolicBP,
        cholesterol: patientData.cholesterol,
        bmi,
        smoking: Boolean(patientData.smoking),
        diabetes: Boolean(patientData.diabetes),
      },
      predictedRiskScore: predictionRes.riskScore,
      predictedRiskLevel: predictionRes.riskLevel,
      topContributingFactor: predictionRes.featureImportance?.[0]?.feature,
      actualEventType: actualOutcome.eventType,
      actualOutcomeDate: actualOutcome.outcomeDate,
      actualOutcomeSource: actualOutcome.outcomeSource,
    });

    const updatedMetrics = calculateValidationMetrics();

    res.status(200).json({
      success: true,
      case: registeredCase,
      metrics: updatedMetrics,
      prediction: predictionRes,
    });
  } catch (err: any) {
    logger.error(`Error in validateHistoricalCaseController: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getValidationMetricsController = async (req: Request, res: Response) => {
  try {
    const metrics = calculateValidationMetrics();
    res.status(200).json({
      success: true,
      metrics,
    });
  } catch (err: any) {
    logger.error(`Error in getValidationMetricsController: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const downloadValidationReportPdfController = async (req: Request, res: Response) => {
  try {
    const filename = `HridayaDarpana_Clinical_Validation_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    buildValidationReportPdf(res);
  } catch (err: any) {
    logger.error(`Error in downloadValidationReportPdfController: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
};

