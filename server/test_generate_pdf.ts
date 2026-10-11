import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { buildReportPdf } from './src/utils/pdf.js';
import { generatePersonalizedPreventionPlan } from './src/services/preventionService.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Finding user and prediction in database...');
  let user = await prisma.user.findFirst({
    where: { predictions: { some: {} } },
    include: {
      profile: true,
      predictions: {
        include: { factors: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!user || user.predictions.length === 0) {
    console.log('No user with predictions found.');
    return;
  }

  const prediction = user.predictions[0];
  const factors = prediction.factors as any;

  console.log(`Generating report for User: ${user.email}, Prediction ID: ${prediction.id}`);
  console.log(`Patient factors: Age ${factors?.age}, BP ${factors?.systolicBP}/${factors?.diastolicBP}, BMI ${factors?.bmi}`);

  const preventionPlan = generatePersonalizedPreventionPlan(user.id, prediction, factors);

  const outPath = 'sample_report_output.pdf';
  const writeStream = fs.createWriteStream(outPath);

  buildReportPdf(writeStream as any, {
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
    factors: factors,
    preventionPlan,
  });

  writeStream.on('finish', () => {
    console.log(`Successfully generated PDF: ${outPath} (${fs.statSync(outPath).size} bytes)`);
  });
}

main().catch(console.error);
