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

  // 3. Risk Assessment Box
  doc.fillColor(secondaryColor).fontSize(14).font('Helvetica-Bold').text('Cardiovascular Risk Assessment', 40, 220);
  doc.rect(40, 237, 515, 1).fill(borderLight);
  
  // Colored indicator box
  doc.rect(40, 250, 515, 60).fill('#F8FAFC');
  doc.rect(40, 250, 8, 60).fill(riskColor);
  
  doc.fillColor(secondaryColor).fontSize(12).font('Helvetica-Bold').text('Risk Level:', 65, 262);
  doc.fillColor(riskColor).fontSize(14).font('Helvetica-Bold').text(`${data.prediction.riskLevel} RISK`, 135, 261);
  
  doc.fillColor(secondaryColor).fontSize(10).font('Helvetica-Bold').text('AI Classifier Confidence:', 320, 263);
  doc.fillColor(bodyText).font('Helvetica').text(`${(data.prediction.confidenceScore * 100).toFixed(1)}%`, 440, 263);

  doc.fillColor(bodyText).fontSize(9).font('Helvetica-Oblique').text(data.prediction.plainExplanation, 65, 285, { width: 470 });

  // 4. SHAP Feature Analysis
  doc.fillColor(secondaryColor).fontSize(14).font('Helvetica-Bold').text('Explainable AI (SHAP) Factor Contributions', 40, 330);
  doc.rect(40, 347, 515, 1).fill(borderLight);
  doc.fillColor(bodyText).fontSize(9.5).font('Helvetica').text('SHAP values quantify how much each medical indicator contributed to the AI model\'s final risk assessment decision. Positive values push the risk score higher, while negative values push it lower.', 40, 355, { width: 515 });

  // Draw table header
  let tableY = 390;
  doc.rect(40, tableY, 515, 20).fill('#F1F5F9');
  doc.fillColor(secondaryColor).fontSize(9).font('Helvetica-Bold')
     .text('Medical Feature Indicator', 50, tableY + 6)
     .text('Recorded Value', 220, tableY + 6)
     .text('AI Risk Influence Direction', 340, tableY + 6)
     .text('SHAP Weight', 480, tableY + 6);

  tableY += 20;

  // List top 6 features from SHAP
  const topFeatures = Array.isArray(data.prediction.shapExplanation) 
    ? data.prediction.shapExplanation.slice(0, 6)
    : [];

  topFeatures.forEach((feat: any) => {
    // Draw row separator
    doc.rect(40, tableY, 515, 1).fill(borderLight);
    
    // Feature details
    const direction = feat.impact === 'INCREASES_RISK' ? 'Increases Risk (+)' : 'Reduces Risk (-)';
    const directionColor = feat.impact === 'INCREASES_RISK' ? '#EF4444' : '#10B981';
    
    doc.fillColor(bodyText).fontSize(9).font('Helvetica')
       .text(feat.feature, 50, tableY + 6)
       .text(String(feat.value), 220, tableY + 6);
       
    doc.fillColor(directionColor).text(direction, 340, tableY + 6);
    doc.fillColor(bodyText).text(feat.shap_value.toFixed(4), 480, tableY + 6);

    tableY += 20;
  });

  // 5. Preventive Recommendations
  doc.fillColor(secondaryColor).fontSize(14).font('Helvetica-Bold').text('AI-Generated Preventive Health Plan', 40, tableY + 20);
  doc.rect(40, tableY + 37, 515, 1).fill(borderLight);
  
  let recY = tableY + 45;
  
  doc.fillColor(secondaryColor).fontSize(11).font('Helvetica-Bold').text('Dietary Guideline Prescriptions', 40, recY);
  recY += 15;
  data.diet.slice(0, 3).forEach((item) => {
    doc.fillColor(bodyText).fontSize(9).font('Helvetica').text(`• ${item}`, 50, recY, { width: 500 });
    recY += doc.heightOfString(`• ${item}`, { width: 500 }) + 3;
  });

  recY += 5;
  doc.fillColor(secondaryColor).fontSize(11).font('Helvetica-Bold').text('Exercise & Cardiac Training Guidance', 40, recY);
  recY += 15;
  data.exercise.slice(0, 3).forEach((item) => {
    doc.fillColor(bodyText).fontSize(9).font('Helvetica').text(`• ${item}`, 50, recY, { width: 500 });
    recY += doc.heightOfString(`• ${item}`, { width: 500 }) + 3;
  });

  // Footer / Disclaimer
  const disclaimer = 'Disclaimer: HridyaDarpan is an AI-powered educational major engineering project. This diagnostic report is synthesized using machine learning predictions for demonstration purposes and does not represent real clinical medical advice. Please consult a professional cardiologist for actual health concerns.';
  doc.rect(40, 755, 515, 1).fill(borderLight);
  doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica-Oblique').text(disclaimer, 40, 765, { align: 'center', width: 515 });

  doc.end();
};
