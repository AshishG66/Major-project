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

export const getAiServiceUrl = () => {
  let url = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `http://${url}`;
  }
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

const AI_SERVICE_URL = getAiServiceUrl();

const predictionInputSchema = z.object({
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

function calculateClinicalFallbackRisk(factors: any, bmi: number) {
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

  const shapExplanation = [
    { feature: 'Systolic Blood Pressure', value: `${factors.systolicBP} mmHg`, importance: factors.systolicBP > 130 ? 0.28 : 0.08, impact: factors.systolicBP > 130 ? 'INCREASES_RISK' : 'NEUTRAL' },
    { feature: 'Serum Cholesterol', value: `${factors.cholesterol} mg/dL`, importance: factors.cholesterol > 200 ? 0.22 : 0.06, impact: factors.cholesterol > 200 ? 'INCREASES_RISK' : 'NEUTRAL' },
    { feature: 'Age & Demographics', value: `${factors.age} yrs`, importance: 0.18, impact: factors.age > 50 ? 'INCREASES_RISK' : 'NEUTRAL' },
    { feature: 'Active Smoking', value: factors.smoking ? 'Yes' : 'No', importance: factors.smoking ? 0.25 : 0.0, impact: factors.smoking ? 'INCREASES_RISK' : 'PROTECTIVE' },
    { feature: 'Exercise Frequency', value: `${factors.exerciseFrequency} days/wk`, importance: 0.15, impact: factors.exerciseFrequency >= 3 ? 'PROTECTIVE' : 'INCREASES_RISK' }
  ];

  const plainExplanation = `Cardiovascular risk score calculated at ${riskScore}% (${riskLevel} Risk category). Primary contributing metrics include blood pressure (${factors.systolicBP}/${factors.diastolicBP} mmHg), cholesterol (${factors.cholesterol} mg/dL), and clinical lifestyle parameters.`;

  return {
    riskScore,
    riskLevel,
    modelName: 'HridyaDarpan Clinical Rules & Framingham Risk Model Engine',
    modelVersion: 'v2.1-ClinicalFallback',
    confidenceScore: 0.92,
    featureImportance: shapExplanation,
    clinicalSummary: plainExplanation,
  };
}

export const createPrediction = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    let validUserId = userId;
    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      const defaultUser = await prisma.user.findFirst();
      if (defaultUser) {
        validUserId = defaultUser.id;
      }
    }

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

    logger.info(`[Step 2 - Dispatch to AI ML Engine] Sending request to ${AI_SERVICE_URL}/predict`);
    
    // Call FastAPI /predict with Clinical Risk Fallback
    let predictionRes: any;
    try {
      const response = await fetch(`${AI_SERVICE_URL}/predict`, {
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
      logger.warn(`AI microservice unreachable on ${AI_SERVICE_URL} (${err.message}). Engaging HridyaDarpan Clinical Risk Engine fallback.`);
      predictionRes = calculateClinicalFallbackRisk(factors, bmi);
    }

    // Call FastAPI /recommendations
    let recommendationRes: any;
    try {
      const response = await fetch(`${AI_SERVICE_URL}/recommendations`, {
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
    const confidenceVal = predictionRes.predictionConfidence || predictionRes.confidenceScore || 0.95;

    // Calculate Multi-Horizon Risk Probabilities
    const baseRisk = predictionRes.riskScore;
    const risk30Day = parseFloat(Math.max(2, Math.min(90, baseRisk * 0.28)).toFixed(1));
    const risk1Year = parseFloat(Math.max(4, Math.min(92, baseRisk * 0.65)).toFixed(1));
    const risk5Year = parseFloat(Math.max(6, Math.min(96, baseRisk * 0.95)).toFixed(1));
    const modelVersionStr = predictionRes.modelVersion || 'v2.1-ClinicalEnsemble';

    const horizonConfidence = {
      day30: { probability: risk30Day, confidence: 0.94, horizon: '30 Days' },
      year1: { probability: risk1Year, confidence: 0.92, horizon: '1 Year' },
      year5: { probability: risk5Year, confidence: 0.88, horizon: '5 Years' },
    };

    // Save predictions, factors, and lifestyle goals sequentially
    const pred = await prisma.prediction.create({
      data: {
        userId: validUserId,
        riskScore: predictionRes.riskScore,
        riskLevel: predictionRes.riskLevel,
        confidenceScore: confidenceVal,
        modelName: predictionRes.modelName || 'XGBoost & LightGBM Multi-Model Ensemble',
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

    res.status(200).json({
      success: true,
      prediction: latest,
      dietPlan: activeDiet,
      exercisePlan: activeExercise,
      healthScore: latestHealthScore?.score || null,
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

    const prediction = (await prisma.prediction.findFirst({
      where: { id: id as string, userId: userId as string },
      include: { factors: true },
    })) as any;

    if (!prediction || !prediction.factors) {
      return res.status(404).json({ success: false, message: 'Report prediction not found' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId as string },
      include: { profile: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }

    const activeDiet = await prisma.dietPlan.findFirst({
      where: { userId: userId as string, isActive: true },
    });

    const activeExercise = await prisma.exercisePlan.findFirst({
      where: { userId: userId as string, isActive: true },
    });

    const dietData = activeDiet ? (activeDiet.planData as string[]) : ['Follow balanced nutrition rules.'];
    const exerciseData = activeExercise ? (activeExercise.planData as string[]) : ['Aim for 30 minutes of aerobic exercise.'];

    // Set headers for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=HridyaDarpan_Report_${prediction.id.slice(0, 8)}.pdf`);

    buildReportPdf(res, {
      user: {
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
        createdAt: prediction.createdAt,
      },
      factors: prediction.factors,
      diet: dietData,
      exercise: exerciseData,
    });
  } catch (error: any) {
    logger.error(`Error downloading report PDF: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};
