import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { logger } from '../config/logger.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

function calculateSimulatedRisk(factors: any, modifiedFactor: string, modifiedValue: number) {
  const modFactors = { ...factors, [modifiedFactor]: modifiedValue };
  
  let score = 10;
  const age = modFactors.age || 50;
  const sys = modFactors.systolicBP || 120;
  const dia = modFactors.diastolicBP || 80;
  const chol = modFactors.cholesterol || 200;
  const hr = modFactors.heartRate || 72;
  const ex = modFactors.exerciseFrequency || 3;
  const smk = modFactors.smoking ? true : false;
  const bmi = modFactors.bmi || (modFactors.weight && modFactors.height ? modFactors.weight / ((modFactors.height / 100) ** 2) : 25);

  if (age > 65) score += 25;
  else if (age > 50) score += 15;
  else if (age > 40) score += 8;

  if (sys >= 160) score += 25;
  else if (sys >= 140) score += 18;
  else if (sys >= 130) score += 10;

  if (dia >= 100) score += 15;
  else if (dia >= 90) score += 8;

  if (chol >= 240) score += 20;
  else if (chol >= 200) score += 10;

  if (bmi >= 30) score += 12;
  else if (bmi >= 25) score += 6;

  if (hr >= 90) score += 8;
  if (smk) score += 18;

  if (ex >= 4) score -= 12;
  else if (ex >= 2) score -= 6;

  const modifiedRisk = Math.max(5, Math.min(95, Math.round(score)));

  let modifiedLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (modifiedRisk >= 75) modifiedLevel = 'CRITICAL';
  else if (modifiedRisk >= 50) modifiedLevel = 'HIGH';
  else if (modifiedRisk >= 25) modifiedLevel = 'MODERATE';

  return { modifiedRisk, modifiedLevel };
}

export const runWhatIfSimulation = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    const { originalFactors, modifiedFactor, modifiedValue } = req.body;

    if (!originalFactors || !modifiedFactor || modifiedValue === undefined) {
      return res.status(400).json({
        success: false,
        message: 'originalFactors, modifiedFactor, and modifiedValue are required.',
      });
    }

    // Try calling Python FastAPI /what-if microservice endpoint
    try {
      const response = await fetch(`${AI_SERVICE_URL}/what-if`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...originalFactors,
          modifiedFactor,
          modifiedValue: parseFloat(modifiedValue),
        }),
      });

      if (response.ok) {
        const pyResult = (await response.json()) as Record<string, any>;
        return res.status(200).json({
          success: true,
          source: 'fastapi_microservice',
          ...pyResult,
          disclaimer: 'What-If Simulation is for exploratory decision-support and does not overwrite official patient medical records.',
        });
      }
    } catch (err: any) {
      logger.warn(`FastAPI /what-if service unreachable (${err.message}). Engaging HridyaDarpan Clinical Simulation Engine fallback.`);
    }

    // Clinical Fallback Simulator
    const originalRisk = originalFactors.riskScore || 25;
    const { modifiedRisk, modifiedLevel } = calculateSimulatedRisk(originalFactors, modifiedFactor, parseFloat(modifiedValue));
    const delta = parseFloat((modifiedRisk - originalRisk).toFixed(1));

    const factorNames: Record<string, string> = {
      systolicBP: 'systolic blood pressure',
      cholesterol: 'serum cholesterol',
      bmi: 'BMI',
      exerciseFrequency: 'weekly exercise frequency',
      smoking: 'smoking habit',
      heartRate: 'resting heart rate',
    };

    const label = factorNames[modifiedFactor] || modifiedFactor;
    const isImprovement = delta < 0;

    const explanation = `If you modify ${label} to ${modifiedValue}, your estimated cardiovascular risk changes from ${originalRisk}% → ${modifiedRisk}% (${Math.abs(delta)} percentage points ${isImprovement ? 'reduction' : 'increase'}).`;

    res.status(200).json({
      success: true,
      source: 'clinical_engine_fallback',
      originalRisk,
      originalLevel: originalFactors.riskLevel || 'MODERATE',
      modifiedRisk,
      modifiedLevel,
      delta,
      factorModified: modifiedFactor,
      originalValue: originalFactors[modifiedFactor],
      modifiedValue: parseFloat(modifiedValue),
      explanation,
      impact: isImprovement ? 'improvement' : 'increase',
      disclaimer: 'What-If Simulation is for exploratory decision-support and does not overwrite official patient medical records.',
    });
  } catch (error: any) {
    logger.error(`Error executing what-if simulation: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};
