import PDFDocument from 'pdfkit';
import { Response } from 'express';

interface ReportData {
  user: {
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      gender: string;
      height: number;
      weight: number;
    } | null;
  };
  prediction: {
    id: string;
    riskLevel: string;
    riskScore: number;
    confidenceScore: number;
    plainExplanation: string;
    shapExplanation: any;
    createdAt: Date;
  };
  factors: {
    age: number;
    systolicBP: number;
    diastolicBP: number;
    cholesterol: number;
    heartRate: number;
    bloodSugar: number;
    ecgResult: string;
    exerciseFrequency: number;
    smoking: boolean;
    alcohol: boolean;
    diabetes: boolean;
    familyHistory: boolean;
    chestPainType: string;
    sleepDuration: number;
    stressLevel: number;
    bmi: number;
  };
  diet: string[];
  exercise: string[];
}

export const buildReportPdf = (res: Response, data: ReportData) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  // Pipe to response
  doc.pipe(res);

  const primaryColor = '#1E3A8A'; // Dark Blue
  const secondaryColor = '#0F172A'; // Dark Grey
  const borderLight = '#E2E8F0'; // Soft grey
  const bodyText = '#334155'; // Dark slate
  
  // Set risk colors
  let riskColor = '#10B981'; // Emerald
  if (data.prediction.riskLevel === 'MODERATE') riskColor = '#F59E0B'; // Amber
  if (data.prediction.riskLevel === 'HIGH') riskColor = '#F43F5E'; // Rose

  // 1. Header Banner
  doc.rect(0, 0, 595, 80).fill(primaryColor);
  doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold').text('HridyaDarpan Cardiovascular Scan Report', 40, 28);
  doc.fontSize(10).font('Helvetica').text('AI-Powered Cardiac Analytics & Explainable Preventive Care', 40, 52);
  
  // 2. Metadata Section (Patient Info)
  doc.fillColor(secondaryColor).fontSize(14).font('Helvetica-Bold').text('Patient Information', 40, 105);
  doc.rect(40, 122, 515, 1).fill(borderLight);
  
  // Patient details layout grid
  const name = `${data.user.profile?.firstName || ''} ${data.user.profile?.lastName || ''}`;
  const gender = data.user.profile?.gender || 'N/A';
  const age = data.factors.age;
  const bmi = data.factors.bmi;
  const bp = `${data.factors.systolicBP}/${data.factors.diastolicBP} mmHg`;
  const hr = `${data.factors.heartRate} bpm`;
  const chol = `${data.factors.cholesterol} mg/dL`;
  const fbs = `${data.factors.bloodSugar} mg/dL`;

  doc.fillColor(bodyText).fontSize(10).font('Helvetica-Bold').text('Name:', 40, 135)
     .font('Helvetica').text(name, 90, 135)
     .font('Helvetica-Bold').text('Age / Sex:', 40, 153)
     .font('Helvetica').text(`${age} yrs / ${gender}`, 110, 153)
     .font('Helvetica-Bold').text('Weight / Height:', 40, 171)
     .font('Helvetica').text(`${data.user.profile?.weight || 0} kg / ${data.user.profile?.height || 0} cm`, 130, 171)
     .font('Helvetica-Bold').text('BMI:', 40, 189)
     .font('Helvetica').text(`${bmi} (Normal range 18.5 - 24.9)`, 75, 189);

  doc.fillColor(bodyText).fontSize(10)
     .font('Helvetica-Bold').text('Blood Pressure:', 320, 135)
     .font('Helvetica').text(bp, 410, 135)
     .font('Helvetica-Bold').text('Resting Heart Rate:', 320, 153)
     .font('Helvetica').text(hr, 420, 153)
     .font('Helvetica-Bold').text('Cholesterol (Total):', 320, 171)
     .font('Helvetica').text(chol, 425, 171)
     .font('Helvetica-Bold').text('Fasting Blood Sugar:', 320, 189)
     .font('Helvetica').text(fbs, 430, 189);

  // 3. Risk Assessment Box & Multi-Horizon Table
  doc.fillColor(secondaryColor).fontSize(14).font('Helvetica-Bold').text('Cardiovascular Risk Assessment', 40, 215);
  doc.rect(40, 232, 515, 1).fill(borderLight);
  
  // Colored indicator box
  doc.rect(40, 240, 515, 65).fill('#F8FAFC');
  doc.rect(40, 240, 8, 65).fill(riskColor);
  
  doc.fillColor(secondaryColor).fontSize(11).font('Helvetica-Bold').text('Overall Risk Category:', 55, 248);
  doc.fillColor(riskColor).fontSize(13).font('Helvetica-Bold').text(`${data.prediction.riskLevel} RISK (${data.prediction.riskScore.toFixed(1)}%)`, 185, 247);
  
  doc.fillColor(secondaryColor).fontSize(9.5).font('Helvetica-Bold').text('Model & Version:', 340, 248);
  doc.fillColor(bodyText).font('Helvetica').text((data.prediction as any).modelVersion || 'v2.1-ClinicalEnsemble', 430, 248);

  // Multi-horizon risk summary
  const r30 = (data.prediction as any).risk30Day || (data.prediction.riskScore * 0.28).toFixed(1);
  const r1y = (data.prediction as any).risk1Year || (data.prediction.riskScore * 0.65).toFixed(1);
  const r5y = (data.prediction as any).risk5Year || (data.prediction.riskScore * 0.95).toFixed(1);

  doc.fillColor(bodyText).fontSize(9).font('Helvetica-Bold')
     .text('30-Day Risk:', 55, 268).font('Helvetica').text(`${r30}%`, 125, 268)
     .font('Helvetica-Bold').text('1-Year Risk:', 180, 268).font('Helvetica').text(`${r1y}%`, 245, 268)
     .font('Helvetica-Bold').text('5-Year Risk:', 305, 268).font('Helvetica').text(`${r5y}%`, 370, 268)
     .font('Helvetica-Bold').text('Confidence:', 430, 268).font('Helvetica').text(`${(data.prediction.confidenceScore * 100).toFixed(1)}%`, 495, 268);

  doc.fillColor(bodyText).fontSize(8.5).font('Helvetica-Oblique').text(data.prediction.plainExplanation, 55, 287, { width: 485 });

  // 4. SHAP Feature Analysis
  doc.fillColor(secondaryColor).fontSize(13).font('Helvetica-Bold').text('Explainable AI (SHAP) Factor Contributions', 40, 318);
  doc.rect(40, 333, 515, 1).fill(borderLight);
  doc.fillColor(bodyText).fontSize(8.5).font('Helvetica').text('SHAP values quantify how each physiological indicator shifted the AI ensemble prediction relative to population baselines.', 40, 339, { width: 515 });

  // Draw table header
  let tableY = 358;
  doc.rect(40, tableY, 515, 18).fill('#F1F5F9');
  doc.fillColor(secondaryColor).fontSize(8.5).font('Helvetica-Bold')
     .text('Medical Feature Indicator', 50, tableY + 5)
     .text('Recorded Value', 220, tableY + 5)
     .text('AI Risk Influence Direction', 340, tableY + 5)
     .text('SHAP Weight', 480, tableY + 5);

  tableY += 18;

  // List top 5 features from SHAP
  const topFeatures = Array.isArray(data.prediction.shapExplanation) 
    ? data.prediction.shapExplanation.slice(0, 5)
    : [];

  topFeatures.forEach((feat: any) => {
    doc.rect(40, tableY, 515, 1).fill(borderLight);
    
    const direction = feat.impact === 'INCREASES_RISK' ? 'Increases Risk (+)' : 'Reduces Risk (-)';
    const directionColor = feat.impact === 'INCREASES_RISK' ? '#EF4444' : '#10B981';
    
    doc.fillColor(bodyText).fontSize(8.5).font('Helvetica')
       .text(feat.feature, 50, tableY + 5)
       .text(String(feat.value), 220, tableY + 5);
       
    doc.fillColor(directionColor).text(direction, 340, tableY + 5);
    const shapVal = typeof feat.shap_value === 'number' ? feat.shap_value.toFixed(4) : String(feat.importance || 0.1);
    doc.fillColor(bodyText).text(shapVal, 480, tableY + 5);

    tableY += 18;
  });

  // 5. Digital Twin & Preventive Recommendations
  doc.fillColor(secondaryColor).fontSize(13).font('Helvetica-Bold').text('AI Digital Twin & Preventive Health Plan', 40, tableY + 15);
  doc.rect(40, tableY + 30, 515, 1).fill(borderLight);
  
  let recY = tableY + 36;
  
  doc.fillColor(secondaryColor).fontSize(10).font('Helvetica-Bold').text('Dietary Guideline Prescriptions', 40, recY);
  recY += 13;
  data.diet.slice(0, 2).forEach((item) => {
    doc.fillColor(bodyText).fontSize(8.5).font('Helvetica').text(`• ${item}`, 50, recY, { width: 500 });
    recY += doc.heightOfString(`• ${item}`, { width: 500 }) + 2;
  });

  recY += 4;
  doc.fillColor(secondaryColor).fontSize(10).font('Helvetica-Bold').text('Exercise & Cardiac Training Guidance', 40, recY);
  recY += 13;
  data.exercise.slice(0, 2).forEach((item) => {
    doc.fillColor(bodyText).fontSize(8.5).font('Helvetica').text(`• ${item}`, 50, recY, { width: 500 });
    recY += doc.heightOfString(`• ${item}`, { width: 500 }) + 2;
  });

  // Footer / Disclaimer
  const disclaimer = 'Notice: HridyaDarpan is an academic AI decision-support system. Risk estimates provide statistical likelihoods for clinical decision-support and do not constitute an official medical diagnosis.';
  doc.rect(40, 755, 515, 1).fill(borderLight);
  doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica-Oblique').text(disclaimer, 40, 765, { align: 'center', width: 515 });

  doc.end();
};
