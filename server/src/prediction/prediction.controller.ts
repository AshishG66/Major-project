import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { logger } from '../config/logger.js';
import { buildReportPdf } from '../utils/pdf.js';
import { eventBus, EVENTS } from '../utils/eventBus.js';
import { createAuditLogEntry } from '../services/hashChainService.js';
import { updateDigitalTwinState } from '../services/digitalTwinService.js';
import { checkAndTriggerAlerts } from '../services/alertService.js';
import { generatePersonalizedPreventionPlan, generateFallbackPreventionPlan } from '../services/preventionService.js';
import { extractClinicalReport } from '../services/clinicalReportExtractionService.js';
import { calculateValidationMetrics, registerValidationCase, buildValidationReportPdf } from '../services/clinicalValidationService.js';
import { analyzeClinicalReportFile, executeClinicalReportPrediction } from '../services/clinicalReport/index.js';

export const getAiServiceUrl = () => {
  const envUrl = process.env.AI_SERVICE_URL || process.env.FASTAPI_URL;
  if (!envUrl || envUrl === 'http://localhost:8000' || envUrl === 'http://127.0.0.1:8000') {
    return process.env.NODE_ENV === 'production' 
      ? 'https://hridayadarpana-ai.onrender.com' 
      : (envUrl || 'http://127.0.0.1:8000');
  }
  if (envUrl === 'hridayadarpana-ai' || envUrl === 'http://hridayadarpana-ai') {
    return 'https://hridayadarpana-ai.onrender.com';
  }
  let url = envUrl;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  return url.endsWith('/') ? url.slice(0, -1) : url;
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

export const createPrediction = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      return res.status(401).json({ success: false, message: 'User account not found' });
    }
    const validUserId = userId;

    const parsed = predictionInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.format(),
      });
    }

    logger.info(`[Step 1 - API Request] Received prediction payload for user ${userId}: ${JSON.stringify(parsed.data)}`);

    const factors = parsed.data;

    // Calculate BMI
    const bmi = parseFloat((factors.weight / ((factors.height / 100) ** 2)).toFixed(1));

    // Map categories to integers for FastAPI classifier input
    const genderInt = factors.gender === 'MALE' ? 0 : 1;
    const ecgInt = factors.ecgResult === 'NORMAL' ? 0 : factors.ecgResult === 'ST_T_ABNORMAL' ? 1 : 2;
    const chestPainInt = factors.chestPainType === 'TYPICAL' ? 0 : factors.chestPainType === 'ATYPICAL' ? 1 : factors.chestPainType === 'NON_ANGINAL' ? 2 : 3;

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
    };

    const aiServiceUrl = getAiServiceUrl();
    logger.info(`[Step 2 - Dispatch to AI ML Engine] Sending request to ${aiServiceUrl}/predict`);
    
    // Call FastAPI /predict with Clinical Risk Fallback
    let predictionRes: any;
    try {
      const response = await fetch(`${aiServiceUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fastApiPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI Service returned status ${response.status}: ${errorText}`);
      }

      predictionRes = await response.json();
      logger.info(`[Step 3 - ML Prediction Generated] RiskScore: ${predictionRes.riskScore}%, RiskLevel: ${predictionRes.riskLevel}, Model: ${predictionRes.modelVersion || 'v2.1'}`);
    } catch (err: any) {
      logger.warn(`AI microservice unreachable on ${aiServiceUrl} (${err.message}). Engaging HridyaDarpan Clinical Risk Engine fallback.`);
      predictionRes = calculateClinicalFallbackRisk(factors, bmi);
    }

    // Call FastAPI /recommendations
    let recommendationRes: any;
    try {
      const response = await fetch(`${aiServiceUrl}/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          riskLevel: predictionRes.riskLevel,
          age: factors.age,
          gender: genderInt,
          systolicBP: factors.systolicBP,
          diastolicBP: factors.diastolicBP,
          cholesterol: factors.cholesterol,
          bloodSugar: factors.bloodSugar,
          bmi,
          exerciseFrequency: factors.exerciseFrequency,
          smoking: factors.smoking ? 1 : 0,
        }),
      });

      if (response.ok) {
        recommendationRes = await response.json();
      }
    } catch (err: any) {
      logger.warn(`Failed to retrieve recommendations from AI service: ${err.message}`);
    }

    const fallbackRecs = {
      diet: ["Maintain DASH / Mediterranean diet low in saturated fats and refined sugars.", "Restrict daily sodium intake to under 1,500 - 2,000 mg."],
      exercise: ["Engage in 150 minutes of moderate-intensity aerobic exercise weekly."],
      lifestyle: ["Target 7-8 hours of restful sleep daily.", "Schedule annual lipid profiles and ECG screenings."],
      weeklyGoal: "Complete 150 minutes of light active exercise.",
    };
    
    const recs: any = recommendationRes || predictionRes.recommendations || fallbackRecs;

    // Scale Cardio Health Score: e.g., 100 - riskScore (which is weighted probability)
    const healthScoreVal = Math.max(10, Math.min(100, Math.round(100 - predictionRes.riskScore)));

    const shapExplanationData = predictionRes.featureImportance || predictionRes.contributions || [];
    const plainExplanationText = predictionRes.clinicalSummary || predictionRes.plainExplanation || `Risk evaluated as ${predictionRes.riskLevel} (${predictionRes.riskScore}%).`;
    const confidenceVal = predictionRes.isMlPrediction === false ? 0.0 : (predictionRes.predictionConfidence ?? 0.0);

    // Multi-Horizon Risk Probabilities: Disable unsupported fixed multiplier estimates
    const risk30Day: number | null = null;
    const risk1Year: number | null = null;
    const risk5Year: number | null = null;
    const modelVersionStr = predictionRes.modelVersion || (predictionRes.isMlPrediction === false ? 'v2.1-HeuristicFallback' : 'v2.1-HonestOrchestrator');

    const horizonConfidence = {
      day30: { available: false, status: 'UNSUPPORTED', note: 'Requires longitudinal survival cohort data' },
      year1: { available: false, status: 'UNSUPPORTED', note: 'Requires longitudinal survival cohort data' },
      year5: { available: false, status: 'UNSUPPORTED', note: 'Requires longitudinal survival cohort data' },
    };

    // Save predictions, factors, and lifestyle goals sequentially
    const pred = await prisma.prediction.create({
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
      },
    });

    await prisma.predictionFactors.create({
      data: {
        predictionId: pred.id,
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
    });

    // Update Health Score
    await prisma.healthScore.create({
      data: {
        userId: validUserId,
        score: healthScoreVal,
        cardioIndex: parseFloat((100 - predictionRes.riskScore * 0.8).toFixed(1)),
      },
    });

    // Deactivate older plans
    await prisma.dietPlan.updateMany({
      where: { userId: validUserId, isActive: true },
      data: { isActive: false },
    });

    await prisma.exercisePlan.updateMany({
      where: { userId: validUserId, isActive: true },
      data: { isActive: false },
    });

    // Save new diet and exercise plans
    const diet = await prisma.dietPlan.create({
      data: {
        userId: validUserId,
        calories: factors.gender === 'MALE' ? 2200 : 1800,
        macroCarbs: 220,
        macroPro: 90,
        macroFat: 60,
        planData: (recs.diet || recs) as any,
        isActive: true,
      },
    });

    const exercise = await prisma.exercisePlan.create({
      data: {
        userId: validUserId,
        targetMins: factors.exerciseFrequency * 30 || 150,
        planData: (recs.exercise || recs) as any,
        isActive: true,
      },
    });

    const savedData = { prediction: pred, diet, exercise };

    // Asynchronously update Digital Twin State
    updateDigitalTwinState(validUserId, {
      heartRate: factors.heartRate,
      systolicBP: factors.systolicBP,
      diastolicBP: factors.diastolicBP,
      ecgStatus: factors.ecgResult,
      activityMins: factors.exerciseFrequency * 30,
      sleepHours: factors.sleepDuration,
    }).catch((err: any) => logger.warn(`Digital Twin update deferred: ${err.message}`));

    // Asynchronously check dynamic alert thresholds
    checkAndTriggerAlerts({
      userId: validUserId,
      riskLevel: predictionRes.riskLevel,
      riskScore: predictionRes.riskScore,
      systolicBP: factors.systolicBP,
      diastolicBP: factors.diastolicBP,
      heartRate: factors.heartRate,
      factors,
    }).catch((err: any) => logger.warn(`Alert check deferred: ${err.message}`));

    // Record SHA-256 Tamper-Evident Audit Log Entry
    createAuditLogEntry({
      userId: validUserId,
      patientId: validUserId,
      eventType: 'RUN_PREDICTION',
      action: 'EXECUTE_CARDIAC_PREDICTION',
      details: `Executed multi-horizon cardiac risk prediction. Risk: ${predictionRes.riskLevel} (${predictionRes.riskScore}%), 30-Day: ${risk30Day}%, 1-Year: ${risk1Year}%, 5-Year: ${risk5Year}%. Model Version: ${modelVersionStr}.`,
    }).catch((err: any) => logger.warn(`AuditLog write deferred: ${err.message}`));

    logger.info(`[Step 4 - DB Transaction Saved] Saved prediction ID ${savedData.prediction.id} to PostgreSQL database`);

    // Emit prediction event asynchronously through EventBus
    eventBus.emit(EVENTS.PREDICTION_CREATED, {
      userId: validUserId,
      prediction: savedData.prediction,
      healthScore: healthScoreVal,
    });

    const personalizedPreventionPlan = generatePersonalizedPreventionPlan(
      validUserId,
      savedData.prediction,
      factors
    );

    res.status(200).json({
      success: true,
      prediction: {
        id: savedData.prediction.id,
        riskLevel: savedData.prediction.riskLevel,
        riskScore: savedData.prediction.riskScore,
        risk30Day,
        risk1Year,
        risk5Year,
        modelVersion: modelVersionStr,
        horizonConfidence,
        confidenceScore: confidenceVal,
        shapExplanation: shapExplanationData,
        createdAt: savedData.prediction.createdAt,
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
      },
      healthScore: healthScoreVal,
      recommendations: recs,
      preventionPlan: personalizedPreventionPlan,
    });
  } catch (error: any) {
    logger.error(`Error creating prediction: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    const history = await prisma.prediction.findMany({
      where: { userId },
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
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    const latest = await prisma.prediction.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { factors: true },
    });

    const activeDiet = await prisma.dietPlan.findFirst({
      where: { userId, isActive: true },
    });

    const activeExercise = await prisma.exercisePlan.findFirst({
      where: { userId, isActive: true },
    });

    const latestHealthScore = await prisma.healthScore.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const preventionPlan = latest && latest.factors
      ? generatePersonalizedPreventionPlan(userId, latest, latest.factors)
      : generateFallbackPreventionPlan(userId);

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
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    const latest = await prisma.prediction.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { factors: true },
    });

    const preventionPlan = latest && latest.factors
      ? generatePersonalizedPreventionPlan(userId, latest, latest.factors)
      : generateFallbackPreventionPlan(userId);

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
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    const { id } = req.params;

    const prediction = (id === 'latest' || !id)
      ? await prisma.prediction.findFirst({
          where: { userId: userId as string },
          orderBy: { createdAt: 'desc' },
          include: { factors: true },
        })
      : await prisma.prediction.findFirst({
          where: { id: id as string, userId: userId as string },
          include: { factors: true },
        });

    if (!prediction || !prediction.factors) {
      return res.status(404).json({ success: false, message: 'Report prediction not found for this patient' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId as string },
      include: { profile: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }

    // Generate patient-specific personalized prevention plan for this report
    const preventionPlan = generatePersonalizedPreventionPlan(
      userId,
      prediction,
      prediction.factors
    );

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
        modelVersion: prediction.modelVersion || 'v2.1-ClinicalEnsemble',
        risk30Day: prediction.risk30Day,
        risk1Year: prediction.risk1Year,
        risk5Year: prediction.risk5Year,
        modelName: prediction.modelName,
        createdAt: prediction.createdAt,
      },
      factors: prediction.factors as any,
      preventionPlan,
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

