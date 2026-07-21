import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { logger } from '../config/logger.js';
import { buildReportPdf } from '../utils/pdf.js';
import { eventBus, EVENTS } from '../utils/eventBus.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

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

    logger.info(`Sending prediction request for user ${userId} to AI service`);
    
    // Call FastAPI /predict
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
    } catch (err: any) {
      logger.error(`Failed to connect to AI predicting service: ${err.message}`);
      return res.status(502).json({
        success: false,
        message: 'Failed to complete heart prediction due to AI microservice unavailability.',
      });
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
      diet: ["Eat a balanced high-fiber diet.", "Restrict processed sodium."],
      exercise: ["Aim for 30 minutes of daily cardiovascular walking."],
      lifestyle: ["Maintain consistent sleep patterns.", "Incorporate meditation."],
      weeklyGoal: "Complete 150 minutes of light active exercise.",
    };
    
    const recs: any = recommendationRes || fallbackRecs;

    // Scale Cardio Health Score: e.g., 100 - riskScore (which is weighted probability)
    const healthScoreVal = Math.max(10, Math.min(100, Math.round(100 - predictionRes.riskScore)));

    // Save predictions, factors, and lifestyle goals in a single transaction
    const savedData = await prisma.$transaction(async (tx) => {
      const pred = await tx.prediction.create({
        data: {
          userId: validUserId,
          riskScore: predictionRes.riskScore,
          riskLevel: predictionRes.riskLevel,
          confidenceScore: predictionRes.confidenceScore,
          modelName: predictionRes.modelName || 'XGBOOST',
          shapExplanation: predictionRes.contributions as any,
          plainExplanation: predictionRes.plainExplanation,
        },
      });

      await tx.predictionFactors.create({
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
      await tx.healthScore.create({
        data: {
          userId,
          score: healthScoreVal,
          cardioIndex: parseFloat((100 - predictionRes.riskScore * 0.8).toFixed(1)),
        },
      });

      // Deactivate older plans
      await tx.dietPlan.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });

      await tx.exercisePlan.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });

      // Save new diet and exercise plans
      const diet = await tx.dietPlan.create({
        data: {
          userId,
          calories: factors.gender === 'MALE' ? 2200 : 1800,
          macroCarbs: 220,
          macroPro: 90,
          macroFat: 60,
          planData: recs.diet as any,
          isActive: true,
        },
      });

      const exercise = await tx.exercisePlan.create({
        data: {
          userId,
          targetMins: factors.exerciseFrequency * 30 || 150,
          planData: recs.exercise as any,
          isActive: true,
        },
      });

      // Save a reminder notification
      await tx.notification.create({
        data: {
          userId,
          type: 'SYSTEM',
          title: 'Cardio Risk Scan Complete',
          message: `Your cardiovascular risk level was classified as ${predictionRes.riskLevel}. Today's personalized preventive plans have been generated.`,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'RUN_PREDICTION',
          details: `Executed cardiac prediction. Risk: ${predictionRes.riskLevel}, Model: ${predictionRes.modelName}, Health Score: ${healthScoreVal}`,
        },
      });

      return { prediction: pred, diet, exercise };
    });

    // Emit prediction event asynchronously through EventBus
    eventBus.emit(EVENTS.PREDICTION_CREATED, {
      userId,
      prediction: savedData.prediction,
      healthScore: healthScoreVal,
    });

    res.status(200).json({
      success: true,
      prediction: {
        id: savedData.prediction.id,
        riskLevel: savedData.prediction.riskLevel,
        riskScore: savedData.prediction.riskScore,
        confidenceScore: savedData.prediction.confidenceScore,
        plainExplanation: savedData.prediction.plainExplanation,
        shapExplanation: predictionRes.contributions,
        createdAt: savedData.prediction.createdAt,
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
