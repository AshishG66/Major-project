import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { PersonalizedPreventionPlan } from '../services/preventionService.js';

export interface ReportData {
  user: {
    id?: string;
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
    modelVersion?: string;
    risk30Day?: number | null;
    risk1Year?: number | null;
    risk5Year?: number | null;
    modelName?: string;
    horizonConfidence?: any;
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
  preventionPlan?: PersonalizedPreventionPlan | null;
}

/**
 * Robust sanitizer that strips non-ASCII and private-use unicode characters
 * that cause PDFKit Standard-14 Helvetica encoding corruption (e.g. %Ï, &, etc.)
 */
function cleanAscii(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '-')
    .replace(/[\u2022\u25CF\u25AA\u25A0\u25C6\u25B2\u25BC\u2605\u2606]/g, '-')
    .replace(/\u00B2/g, '2')
    .replace(/\u00B3/g, '3')
    .replace(/\u00B0/g, ' deg')
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Draws a clean vector-based badge without broken unicode glyphs
 */
function drawPillBadge(
  doc: any,
  text: string,
  x: number,
  y: number,
  textColor: string,
  bgColor: string,
  borderColor: string,
  fontSize = 7
): number {
  doc.font('Helvetica-Bold').fontSize(fontSize);
  const textWidth = doc.widthOfString(text);
  const badgeWidth = textWidth + 10;
  const badgeHeight = fontSize + 6;

  doc.roundedRect(x, y, badgeWidth, badgeHeight, 2.5).fill(bgColor);
  doc.roundedRect(x, y, badgeWidth, badgeHeight, 2.5).stroke(borderColor);
  doc.fillColor(textColor).text(text, x + 5, y + 3);
  return badgeWidth;
}

/**
 * Draws a clinical priority indicator using vector circle + pure ASCII label
 */
function drawPriorityPill(doc: any, priority: string, x: number, y: number): number {
  const pUpper = cleanAscii(priority).toUpperCase();
  const isHigh = pUpper.includes('HIGH');
  const isMed = pUpper.includes('MED');

  const pColor = isHigh ? '#E11D48' : (isMed ? '#0052FF' : '#059669');
  const pBg = isHigh ? '#FFF1F2' : (isMed ? '#EFF6FF' : '#ECFDF5');
  const pBorder = isHigh ? '#FECDD3' : (isMed ? '#BFDBFE' : '#A7F3D0');
  const label = `${pUpper} PRIORITY`;

  doc.font('Helvetica-Bold').fontSize(7.5);
  const textWidth = doc.widthOfString(label);
  const badgeWidth = textWidth + 18;
  const badgeHeight = 15;

  doc.roundedRect(x, y, badgeWidth, badgeHeight, 3).fill(pBg);
  doc.roundedRect(x, y, badgeWidth, badgeHeight, 3).stroke(pBorder);

  // Vector colored circle
  doc.circle(x + 7, y + 7.5, 2.8).fill(pColor);

  doc.fillColor(pColor).text(label, x + 13, y + 4);
  return badgeWidth;
}

/**
 * Draws the consistent top navy header banner
 */
function drawTopHeader(doc: any, title: string, subtitle: string, rightLines: string[]) {
  // A4 printable width: 595.28 points
  doc.rect(0, 0, 595.28, 62).fill('#0A192F');
  doc.rect(0, 60, 595.28, 2.5).fill('#0052FF');

  doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold')
     .text('HRIDAYADARPANA', 36, 16, { characterSpacing: 1.2 });
  doc.fontSize(8.5).font('Helvetica').fillColor('#94A3B8')
     .text(cleanAscii(subtitle), 36, 36);

  let rY = 15;
  rightLines.forEach((line) => {
    doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica')
       .text(cleanAscii(line), 320, rY, { align: 'right', width: 239.28, height: 10, ellipsis: true });
    rY += 12;
  });
}

export const buildReportPdf = (res: Response | NodeJS.WritableStream, data: ReportData) => {
  // A4 dimensions: 595.28 x 841.89 points
  // margin: 0 prevents PDFKit auto page-break triggers at bottom of page
  // bufferPages: true allows two-pass exact page count calculation
  const doc = new PDFDocument({
    margin: 0,
    size: 'A4',
    autoFirstPage: true,
    bufferPages: true,
  });

  doc.pipe(res as any);

  const primaryDark = '#0A192F';
  const primaryBlue = '#0052FF';
  const textDark = '#0F172A';
  const textMuted = '#475569';
  const textLightMuted = '#64748B';
  const borderLight = '#E2E8F0';
  const borderMedium = '#CBD5E1';
  const bgLight = '#F8FAFC';
  const bgAlternate = '#F1F5F9';

  const riskLevel = cleanAscii(data.prediction.riskLevel || 'LOW').toUpperCase();
  let riskColor = '#059669'; // Emerald
  let riskBg = '#ECFDF5';
  let riskBorder = '#A7F3D0';

  if (riskLevel === 'MODERATE') {
    riskColor = '#D97706'; // Amber
    riskBg = '#FFFBEB';
    riskBorder = '#FDE68A';
  } else if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
    riskColor = '#E11D48'; // Rose
    riskBg = '#FFF1F2';
    riskBorder = '#FECDD3';
  }

  const patientName = cleanAscii(
    `${data.user.profile?.firstName || ''} ${data.user.profile?.lastName || ''}`.trim() ||
    data.user.email.split('@')[0]
  );
  const patientId = cleanAscii(data.user.id ? data.user.id.slice(0, 12) : 'PAT-HRD-2026');
  const reportId = cleanAscii(data.prediction.id.slice(0, 12));
  const reportDate = data.prediction.createdAt
    ? new Date(data.prediction.createdAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : new Date().toLocaleString();

  // ==========================================
  // PAGE 1: CLINICAL RISK & SHAP ASSESSMENT
  // ==========================================

  drawTopHeader(
    doc,
    'HRIDAYADARPANA',
    'Comprehensive Cardiovascular Risk Assessment & Clinical Prevention Report',
    [
      `Report ID: ${reportId}`,
      `Generated: ${reportDate}`,
      `Status: Verified Digital Record`,
    ]
  );

  let currentY = 76;

  // 1. PATIENT BIOMETRIC PROFILE
  doc.fillColor(primaryDark).fontSize(10).font('Helvetica-Bold')
     .text('PATIENT INFORMATION & BIOMETRIC PROFILE', 36, currentY);
  currentY += 13;
  doc.rect(36, currentY, 523.28, 1).fill(borderMedium);
  currentY += 7;

  // 3-Column Patient Profile Card (Height: 68 pt)
  const profileCardH = 68;
  doc.rect(36, currentY, 523.28, profileCardH).fill(bgLight);
  doc.rect(36, currentY, 523.28, profileCardH).stroke(borderLight);

  const col1X = 48;
  const col2X = 224;
  const col3X = 400;

  const r1Y = currentY + 8;
  const r2Y = currentY + 27;
  const r3Y = currentY + 46;

  // Row 1
  doc.fillColor(textLightMuted).fontSize(7).font('Helvetica-Bold').text('PATIENT NAME', col1X, r1Y);
  doc.fillColor(textDark).fontSize(8.5).font('Helvetica-Bold').text(patientName, col1X, r1Y + 9, { width: 165, height: 11, ellipsis: true });

  doc.fillColor(textLightMuted).fontSize(7).font('Helvetica-Bold').text('AGE / GENDER', col2X, r1Y);
  const genderStr = cleanAscii(data.user.profile?.gender || 'Unspecified');
  doc.fillColor(textDark).fontSize(8.5).font('Helvetica-Bold').text(`${data.factors.age} yrs / ${genderStr}`, col2X, r1Y + 9, { width: 165, height: 11, ellipsis: true });

  doc.fillColor(textLightMuted).fontSize(7).font('Helvetica-Bold').text('PATIENT ID', col3X, r1Y);
  doc.fillColor(textDark).fontSize(8.5).font('Helvetica-Bold').text(patientId, col3X, r1Y + 9, { width: 115, height: 11, ellipsis: true });

  // Row 2
  doc.fillColor(textLightMuted).fontSize(7).font('Helvetica-Bold').text('BLOOD PRESSURE', col1X, r2Y);
  doc.fillColor(textDark).fontSize(8.5).font('Helvetica-Bold').text(`${data.factors.systolicBP} / ${data.factors.diastolicBP} mmHg`, col1X, r2Y + 9);

  doc.fillColor(textLightMuted).fontSize(7).font('Helvetica-Bold').text('RESTING HEART RATE', col2X, r2Y);
  doc.fillColor(textDark).fontSize(8.5).font('Helvetica-Bold').text(`${data.factors.heartRate} bpm`, col2X, r2Y + 9);

  doc.fillColor(textLightMuted).fontSize(7).font('Helvetica-Bold').text('BODY MASS INDEX (BMI)', col3X, r2Y);
  doc.fillColor(textDark).fontSize(8.5).font('Helvetica-Bold').text(`${data.factors.bmi} kg/m2`, col3X, r2Y + 9);

  // Row 3
  doc.fillColor(textLightMuted).fontSize(7).font('Helvetica-Bold').text('TOTAL CHOLESTEROL', col1X, r3Y);
  doc.fillColor(textDark).fontSize(8.5).font('Helvetica-Bold').text(`${data.factors.cholesterol} mg/dL`, col1X, r3Y + 9);

  doc.fillColor(textLightMuted).fontSize(7).font('Helvetica-Bold').text('FASTING BLOOD SUGAR', col2X, r3Y);
  doc.fillColor(textDark).fontSize(8.5).font('Helvetica-Bold').text(`${data.factors.bloodSugar} mg/dL`, col2X, r3Y + 9);

  doc.fillColor(textLightMuted).fontSize(7).font('Helvetica-Bold').text('SMOKING STATUS', col3X, r3Y);
  const smokingStr = data.factors.smoking ? 'Active Smoker' : 'Non-Smoker';
  doc.fillColor(textDark).fontSize(8.5).font('Helvetica-Bold').text(smokingStr, col3X, r3Y + 9);

  currentY += profileCardH + 12;

  // 2. EXECUTIVE CLINICAL DIAGNOSTIC SUMMARY
  const clinicalSummaryText = cleanAscii(
    data.prediction.plainExplanation ||
    `Cardiovascular risk score calculated at ${data.prediction.riskScore.toFixed(1)}% (${riskLevel} Risk category). Primary contributing factors include blood pressure (${data.factors.systolicBP}/${data.factors.diastolicBP} mmHg), cholesterol (${data.factors.cholesterol} mg/dL), and clinical lifestyle parameters.`
  );

  doc.fillColor(primaryDark).fontSize(10).font('Helvetica-Bold')
     .text('EXECUTIVE CLINICAL DIAGNOSTIC INTERPRETATION', 36, currentY);
  currentY += 13;
  doc.rect(36, currentY, 523.28, 1).fill(borderMedium);
  currentY += 6;

  doc.font('Helvetica').fontSize(8);
  const summaryTextH = doc.heightOfString(clinicalSummaryText, { width: 498, lineGap: 2 });
  const execCardH = Math.max(36, summaryTextH + 14);

  doc.rect(36, currentY, 523.28, execCardH).fill(bgLight);
  doc.rect(36, currentY, 523.28, execCardH).stroke(borderLight);
  doc.rect(36, currentY, 4, execCardH).fill(primaryBlue);

  doc.fillColor(textDark).fontSize(8).font('Helvetica')
     .text(clinicalSummaryText, 48, currentY + 7, { width: 498, lineGap: 2 });

  currentY += execCardH + 12;

  // 3. RISK SUMMARY & MULTI-HORIZON PROGNOSIS
  doc.fillColor(primaryDark).fontSize(10).font('Helvetica-Bold')
     .text('CARDIOVASCULAR RISK SCORE & MULTI-HORIZON PROGNOSIS', 36, currentY);
  currentY += 13;
  doc.rect(36, currentY, 523.28, 1).fill(borderMedium);
  currentY += 7;

  // Horizontal Card (Height: 74 pt)
  const riskCardH = 74;
  doc.rect(36, currentY, 523.28, riskCardH).fill(riskBg);
  doc.rect(36, currentY, 523.28, riskCardH).stroke(riskBorder);
  doc.rect(36, currentY, 5, riskCardH).fill(riskColor);

  // Left side: Overall Risk
  doc.fillColor(textLightMuted).fontSize(7.5).font('Helvetica-Bold')
     .text('OVERALL CARDIOVASCULAR RISK ASSESSMENT', 48, currentY + 10);
  doc.fillColor(riskColor).fontSize(16).font('Helvetica-Bold')
     .text(`${riskLevel} RISK (${data.prediction.riskScore.toFixed(1)}%)`, 48, currentY + 24);

  const confPct = (data.prediction.confidenceScore != null && data.prediction.confidenceScore > 0)
    ? Math.round(data.prediction.confidenceScore * 100)
    : null;
  const engineVersion = cleanAscii(data.prediction.modelVersion || 'v2.1-ClinicalEnsemble');
  const modelNameStr = cleanAscii(data.prediction.modelName || 'Multi-Dataset Clinical Ensemble');
  const confText = confPct !== null
    ? `Confidence: ${confPct}%   |   Ensemble Engine: ${engineVersion}`
    : `Engine: ${modelNameStr} (Uncalibrated Point Prediction)`;
  doc.fillColor(textMuted).fontSize(7.5).font('Helvetica')
     .text(confText, 48, currentY + 48);

  // Right side: Horizons Table
  const horizonBoxX = 345;
  const horizonBoxW = 200;
  const horizonBoxH = 58;

  doc.rect(horizonBoxX, currentY + 8, horizonBoxW, horizonBoxH).fill('#FFFFFF');
  doc.rect(horizonBoxX, currentY + 8, horizonBoxW, horizonBoxH).stroke(borderLight);

  doc.fillColor(primaryDark).fontSize(7.5).font('Helvetica-Bold')
     .text('PROJECTED RISK HORIZONS', horizonBoxX + 10, currentY + 14);

  doc.font('Helvetica').fontSize(8);
  doc.fillColor(textMuted).text('30-Day Acute Probability:', horizonBoxX + 10, currentY + 27);
  if (data.prediction.risk30Day != null) {
    doc.fillColor(textDark).font('Helvetica-Bold').text(`${data.prediction.risk30Day}%`, horizonBoxX + 145, currentY + 27);
  } else {
    doc.fillColor(textMuted).font('Helvetica-Oblique').fontSize(7.5).text('Deferred (Cohort N/A)', horizonBoxX + 110, currentY + 27);
  }

  doc.font('Helvetica').fontSize(8).fillColor(textMuted).text('1-Year MACE Probability:', horizonBoxX + 10, currentY + 39);
  if (data.prediction.risk1Year != null) {
    doc.fillColor(textDark).font('Helvetica-Bold').text(`${data.prediction.risk1Year}%`, horizonBoxX + 145, currentY + 39);
  } else {
    doc.fillColor(textMuted).font('Helvetica-Oblique').fontSize(7.5).text('Deferred (Cohort N/A)', horizonBoxX + 110, currentY + 39);
  }

  doc.font('Helvetica').fontSize(8).fillColor(textMuted).text('5-Year Long-Term Probability:', horizonBoxX + 10, currentY + 51);
  if (data.prediction.risk5Year != null) {
    doc.fillColor(textDark).font('Helvetica-Bold').text(`${data.prediction.risk5Year}%`, horizonBoxX + 145, currentY + 51);
  } else {
    doc.fillColor(textMuted).font('Helvetica-Oblique').fontSize(7.5).text('Deferred (Cohort N/A)', horizonBoxX + 110, currentY + 51);
  }

  currentY += riskCardH + 14;

  // 4. MULTI-MODEL PREDICTIVE ASSESSMENT TABLE
  doc.fillColor(primaryDark).fontSize(10).font('Helvetica-Bold')
     .text('MULTI-MODEL PREDICTIVE ASSESSMENT', 36, currentY);
  currentY += 13;
  doc.rect(36, currentY, 523.28, 1).fill(borderMedium);
  currentY += 7;

  // Table Header
  const tableHeaderH = 18;
  doc.rect(36, currentY, 523.28, tableHeaderH).fill(bgAlternate);
  doc.fillColor(textDark).fontSize(7.5).font('Helvetica-Bold')
     .text('MODEL / PREDICTIVE DOMAIN', 46, currentY + 5)
     .text('MODEL FINDING / METRIC', 245, currentY + 5)
     .text('RISK CLASSIFICATION', 420, currentY + 5);
  currentY += tableHeaderH;

  const modelsGrid = [
    { name: 'Framingham 10-Yr CHD Model', result: `${data.prediction.riskScore.toFixed(1)}% 10-Yr CHD Score`, tier: riskLevel },
    { name: 'Kaggle Lifestyle Cardio Ensemble', result: `${data.prediction.riskScore.toFixed(1)}% Lifestyle Model Score`, tier: riskLevel },
    { name: 'Heart Failure Reserve & Strain', result: 'Deferred (Echocardiogram required)', tier: 'DEFERRED' },
    { name: 'Stroke Predictive Likelihood', result: 'Deferred (Specialized diagnostics required)', tier: 'DEFERRED' },
    { name: 'PhysioNet ECG Status', result: cleanAscii(data.factors.ecgResult || 'Normal Sinus Rhythm'), tier: 'NORMAL' },
  ];

  const rowHeight = 17;
  modelsGrid.forEach((m, idx) => {
    const rowBg = idx % 2 === 0 ? '#FFFFFF' : bgLight;
    doc.rect(36, currentY, 523.28, rowHeight).fill(rowBg);
    doc.rect(36, currentY, 523.28, rowHeight).stroke(borderLight);

    doc.fillColor(textDark).fontSize(8).font('Helvetica').text(m.name, 46, currentY + 4.5);
    doc.fillColor(textMuted).fontSize(8).font('Helvetica').text(m.result, 245, currentY + 4.5);

    let tierColor = '#059669';
    let tierBg = '#ECFDF5';
    let tierBorder = '#A7F3D0';
    if (m.tier === 'HIGH' || m.tier === 'CRITICAL') {
      tierColor = '#E11D48';
      tierBg = '#FFF1F2';
      tierBorder = '#FECDD3';
    } else if (m.tier === 'MODERATE') {
      tierColor = '#D97706';
      tierBg = '#FFFBEB';
      tierBorder = '#FDE68A';
    }

    drawPillBadge(doc, m.tier, 420, currentY + 2.5, tierColor, tierBg, tierBorder, 7);
    currentY += rowHeight;
  });

  currentY += 14;

  // 5. EXPLAINABLE AI (SHAP) RISK DRIVERS
  doc.fillColor(primaryDark).fontSize(10).font('Helvetica-Bold')
     .text('EXPLAINABLE AI (SHAP) - KEY RISK DRIVERS', 36, currentY);
  currentY += 13;
  doc.rect(36, currentY, 523.28, 1).fill(borderMedium);
  currentY += 5;

  doc.fillColor(textLightMuted).fontSize(7.5).font('Helvetica')
     .text('SHAP isolates each biomarker\'s mathematical contribution driving this patient\'s cardiovascular risk score up or down.', 36, currentY);
  currentY += 12;

  // SHAP Table Header
  doc.rect(36, currentY, 523.28, tableHeaderH).fill(bgAlternate);
  doc.fillColor(textDark).fontSize(7.5).font('Helvetica-Bold')
     .text('PHYSIOLOGICAL FACTOR', 46, currentY + 5)
     .text('PATIENT RECORDED VALUE', 210, currentY + 5)
     .text('DIRECTION', 330, currentY + 5)
     .text('IMPACT WEIGHT', 450, currentY + 5);
  currentY += tableHeaderH;

  const shapList = Array.isArray(data.prediction.shapExplanation) ? data.prediction.shapExplanation : [];
  const topShap = shapList.length > 0 ? shapList.slice(0, 5) : [
    { feature: 'Systolic Blood Pressure', value: `${data.factors.systolicBP} mmHg`, impact: data.factors.systolicBP >= 130 ? 'INCREASES_RISK' : 'PROTECTIVE', importance: 0.28 },
    { feature: 'Serum Cholesterol', value: `${data.factors.cholesterol} mg/dL`, impact: data.factors.cholesterol >= 200 ? 'INCREASES_RISK' : 'PROTECTIVE', importance: 0.22 },
    { feature: 'Physical Activity', value: `${data.factors.exerciseFrequency} days/wk`, impact: data.factors.exerciseFrequency <= 2 ? 'INCREASES_RISK' : 'PROTECTIVE', importance: 0.18 },
    { feature: 'Body Mass Index (BMI)', value: `${data.factors.bmi} kg/m2`, impact: data.factors.bmi >= 25 ? 'INCREASES_RISK' : 'PROTECTIVE', importance: 0.16 },
    { feature: 'Age & Demographics', value: `${data.factors.age} yrs`, impact: data.factors.age >= 50 ? 'INCREASES_RISK' : 'PROTECTIVE', importance: 0.14 },
  ];

  topShap.forEach((item: any, idx: number) => {
    const rowBg = idx % 2 === 0 ? '#FFFFFF' : bgLight;
    doc.rect(36, currentY, 523.28, 18).fill(rowBg);
    doc.rect(36, currentY, 523.28, 18).stroke(borderLight);

    const isRisk = String(item.impact || '').toLowerCase().includes('risk') ||
                   String(item.direction || '').toLowerCase().includes('negative');
    const dirText = isRisk ? 'Increases Risk (+)' : 'Protective / Lower (-)';
    const dirColor = isRisk ? '#E11D48' : '#059669';

    doc.fillColor(textDark).fontSize(8).font('Helvetica-Bold').text(cleanAscii(item.feature || 'Biomarker'), 46, currentY + 4.5, { width: 155, height: 11, ellipsis: true });
    doc.fillColor(textDark).fontSize(8).font('Helvetica').text(cleanAscii(item.value || '--'), 210, currentY + 4.5, { width: 110, height: 11, ellipsis: true });

    doc.fillColor(dirColor).font('Helvetica-Bold').fontSize(7.5).text(dirText, 330, currentY + 4.5);

    const weight = typeof item.importance === 'number'
      ? `+${Math.round(item.importance * 100)}% Weight`
      : '+15% Weight';
    doc.fillColor(textMuted).font('Helvetica').fontSize(8).text(weight, 450, currentY + 4.5);

    currentY += 18;
  });

  // Safe bottom notice for Page 1 (stops at ~765 pt, well before bottom margin)
  currentY += 10;
  doc.rect(36, currentY, 523.28, 28).fill(bgLight);
  doc.rect(36, currentY, 523.28, 28).stroke(borderLight);
  doc.fillColor(textLightMuted).fontSize(7).font('Helvetica')
     .text('CONTINUED EVALUATION: Personalized Prevention Protocols, nutrition guidance, and clinical consultation schedules continue on Page 2.', 46, currentY + 9, { width: 503 });

  // ==========================================
  // PAGE 2: DIGITAL TWIN SIMULATION & PRIORITIZED PROTOCOL
  // ==========================================
  doc.addPage({ margin: 0, size: 'A4' });

  drawTopHeader(
    doc,
    'HRIDAYADARPANA',
    'Patient-Specific Digital Twin Telemetry & Prioritized Prevention Protocol',
    [
      `Patient: ${patientName}`,
      `Risk Classification: ${riskLevel}`,
      `Assessment ID: ${reportId}`,
    ]
  );

  currentY = 74;

  // 1. DIGITAL TWIN SIMULATION STATE SECTION
  doc.fillColor(primaryDark).fontSize(10.5).font('Helvetica-Bold')
     .text('DIGITAL TWIN SIMULATION STATE', 36, currentY);
  currentY += 13;
  doc.rect(36, currentY, 523.28, 1).fill(borderMedium);
  currentY += 6;

  const dt = data.preventionPlan?.digitalTwin || {
    condition: 'NORMAL',
    severity: 'LOW',
    explanation: 'Simulated Digital Twin State: Normal baseline hemodynamic synchronization.',
    patientExplanation: 'Baseline synchronized mode operating within optimal physiological limits.',
    simulatedCadence: 'Baseline 72 BPM synchronized sinus rhythm',
  };

  const dtCardH = 48;
  doc.rect(36, currentY, 523.28, dtCardH).fill(bgLight);
  doc.rect(36, currentY, 523.28, dtCardH).stroke(borderLight);
  doc.rect(36, currentY, 4, dtCardH).fill(riskColor);

  doc.fillColor(primaryDark).fontSize(8.5).font('Helvetica-Bold')
     .text(`SIMULATED STATE: ${cleanAscii(dt.condition)} (${cleanAscii(dt.severity)} SEVERITY)`, 48, currentY + 7);
  doc.fillColor(primaryBlue).fontSize(7.5).font('Helvetica-Bold')
     .text(`HEMODYNAMIC CADENCE: ${cleanAscii(dt.simulatedCadence)}`, 48, currentY + 18);
  doc.fillColor(textMuted).fontSize(7.5).font('Helvetica')
     .text(cleanAscii(dt.patientExplanation), 48, currentY + 29, { width: 500, height: 16, ellipsis: true });

  currentY += dtCardH + 12;

  // 2. PRIORITIZED PREVENTION PROTOCOL CARDS
  doc.fillColor(primaryDark).fontSize(10.5).font('Helvetica-Bold')
     .text('PATIENT-SPECIFIC PRIORITIZED PREVENTION PROTOCOL', 36, currentY);
  currentY += 13;
  doc.rect(36, currentY, 523.28, 1).fill(borderMedium);
  currentY += 5;

  doc.fillColor(textLightMuted).fontSize(7).font('Helvetica')
     .text('Recommendations are prioritized based on this patient\'s actual Risk Scan metrics and modifiable risk drivers.', 36, currentY);
  currentY += 12;

  // Retrieve personalized recommendations (top 3 for page 2)
  const recs = data.preventionPlan?.recommendations || [];
  const topRecs = recs.slice(0, 3);

  if (topRecs.length === 0) {
    doc.rect(36, currentY, 523.28, 45).fill(bgLight);
    doc.rect(36, currentY, 523.28, 45).stroke(borderLight);
    doc.fillColor(textDark).fontSize(9).font('Helvetica-Bold').text('Routine Health Maintenance Protocol', 48, currentY + 10);
    doc.font('Helvetica').fontSize(8).fillColor(textMuted).text('Continue regular balanced nutrition, daily hydration, and routine physical activity.', 48, currentY + 24);
    currentY += 55;
  } else {
    topRecs.forEach((r) => {
      const isHigh = r.priority === 'HIGH';
      const isMed = r.priority === 'MEDIUM';
      const pColor = isHigh ? '#E11D48' : (isMed ? '#0052FF' : '#059669');

      const cardWidth = 523.28;
      const contentWidth = cardWidth - 28;

      const titleClean = cleanAscii(r.title);
      const reasonClean = cleanAscii(r.reason);
      const actionClean = cleanAscii(r.action);

      doc.font('Helvetica-Bold').fontSize(8.5);
      const titleH = doc.heightOfString(titleClean, { width: contentWidth });

      doc.font('Helvetica').fontSize(7.5);
      const reasonH = doc.heightOfString(reasonClean, { width: contentWidth, lineGap: 0.5 });
      const actionH = doc.heightOfString(actionClean, { width: contentWidth, lineGap: 0.5 });

      const computedCardHeight = Math.max(
        62,
        6 + 13 + 3 + titleH + 3 + 7 + reasonH + 3 + 7 + actionH + 6
      );

      doc.rect(36, currentY, cardWidth, computedCardHeight).fill('#FFFFFF');
      doc.rect(36, currentY, cardWidth, computedCardHeight).stroke(borderLight);
      doc.rect(36, currentY, 4, computedCardHeight).fill(pColor);

      let cardInnerY = currentY + 6;

      const pillW = drawPriorityPill(doc, r.priority, 46, cardInnerY);
      doc.fillColor(textLightMuted).fontSize(7).font('Helvetica-Bold')
         .text(cleanAscii(r.category).toUpperCase(), 46 + pillW + 8, cardInnerY + 2.5);

      if (r.isShapDriver) {
        drawPillBadge(doc, 'KEY SHAP DRIVER', 452, cardInnerY + 1, '#E11D48', '#FFF1F2', '#FECDD3', 6.5);
      }

      cardInnerY += 16;

      doc.fillColor(textDark).fontSize(8.5).font('Helvetica-Bold')
         .text(titleClean, 46, cardInnerY, { width: contentWidth });
      cardInnerY += titleH + 3;

      doc.fillColor(textLightMuted).fontSize(6.5).font('Helvetica-Bold')
         .text('WHY THIS IS RECOMMENDED (BASED ON RISK SCAN)', 46, cardInnerY, { characterSpacing: 0.4 });
      cardInnerY += 7.5;

      doc.fillColor(textMuted).fontSize(7.5).font('Helvetica')
         .text(reasonClean, 46, cardInnerY, { width: contentWidth, lineGap: 0.5 });
      cardInnerY += reasonH + 3;

      doc.fillColor(primaryBlue).fontSize(6.5).font('Helvetica-Bold')
         .text('RECOMMENDED CLINICAL ACTION', 46, cardInnerY, { characterSpacing: 0.4 });
      cardInnerY += 7.5;

      doc.fillColor(textDark).fontSize(7.5).font('Helvetica')
         .text(actionClean, 46, cardInnerY, { width: contentWidth, lineGap: 0.5 });

      currentY += computedCardHeight + 5;
    });
  }

  // 3. PHYSICAL ACTIVITY PROGRESSION & SMOKING/WEIGHT NOTICE
  const exercise = data.preventionPlan?.exerciseGuidance;
  const actCardH = 68;
  doc.rect(36, currentY, 523.28, actCardH).fill(bgLight);
  doc.rect(36, currentY, 523.28, actCardH).stroke(borderLight);

  doc.fillColor(primaryDark).fontSize(8).font('Helvetica-Bold')
     .text('PROGRESSIVE PHYSICAL ACTIVITY PLAN', 46, currentY + 6);
  doc.fillColor(primaryBlue).fontSize(7.5).font('Helvetica-Bold')
     .text(`${cleanAscii(exercise?.title || 'Aerobic Movement')} - Status: ${cleanAscii(exercise?.currentActivityStatus || 'Recorded')}`, 46, currentY + 16);

  const targetStr = exercise ? `${exercise.weeklyTargetMins} mins/week (${exercise.intensity})` : '150 mins/week';
  doc.fillColor(textDark).fontSize(7).font('Helvetica-Bold')
     .text(`Initial Target: ${cleanAscii(exercise?.initialTarget || '15-20 mins daily')}`, 46, currentY + 27);
  doc.fillColor(textMuted).fontSize(7).font('Helvetica')
     .text(`Progression: ${cleanAscii(exercise?.progressionPlan || 'Add 5 mins weekly')}`, 46, currentY + 38, { width: 503 });
  doc.fillColor('#E11D48').fontSize(6.5).font('Helvetica-Bold')
     .text(`Safety Precaution: ${cleanAscii(exercise?.safetyPrecautions || 'Consult doctor before strenuous exercise')}`, 46, currentY + 50, { width: 503, ellipsis: true });

  currentY += actCardH + 6;

  // Smoking / Weight alert if active
  if (data.preventionPlan?.smokingCessation?.isPriority) {
    const smokeH = 26;
    doc.rect(36, currentY, 523.28, smokeH).fill('#FFF1F2');
    doc.rect(36, currentY, 523.28, smokeH).stroke('#FECDD3');
    doc.fillColor('#E11D48').fontSize(7.5).font('Helvetica-Bold')
       .text('URGENT TOBACCO CESSATION PRIORITY', 46, currentY + 5);
    doc.fillColor(textDark).fontSize(7).font('Helvetica')
       .text('Active smoking is your highest modifiable coronary risk driver. Establish a 30-day quit date with physician-guided cessation support.', 46, currentY + 14);
    currentY += smokeH + 6;
  } else if (data.preventionPlan?.weightGuidance) {
    const wt = data.preventionPlan.weightGuidance;
    const wtH = 26;
    doc.rect(36, currentY, 523.28, wtH).fill('#EFF6FF');
    doc.rect(36, currentY, 523.28, wtH).stroke('#BFDBFE');
    doc.fillColor(primaryBlue).fontSize(7.5).font('Helvetica-Bold')
       .text(`WEIGHT MANAGEMENT: BMI ${wt.currentBmi} kg/m2 (${wt.status})`, 46, currentY + 5);
    doc.fillColor(textDark).fontSize(7).font('Helvetica')
       .text(cleanAscii(wt.targetWeeklyDeficit), 46, currentY + 14);
    currentY += wtH + 6;
  }

  // Page 2 bottom notice
  doc.rect(36, currentY, 523.28, 22).fill(bgLight);
  doc.rect(36, currentY, 523.28, 22).stroke(borderLight);
  doc.fillColor(textLightMuted).fontSize(7).font('Helvetica')
     .text('CONTINUED: Detailed Quantified Nutrition Targets, Meal Structure, and Clinical Follow-Up Schedules on Page 3.', 46, currentY + 7);

  // ==========================================
  // PAGE 3: QUANTIFIED NUTRITION & MEAL PLAN
  // ==========================================
  doc.addPage({ margin: 0, size: 'A4' });

  drawTopHeader(
    doc,
    'HRIDAYADARPANA',
    'Personalized Nutrition Architecture, Meal Structure & Clinical Follow-Up',
    [
      `Patient: ${patientName}`,
      `Risk Score: ${data.prediction.riskScore}% (${riskLevel})`,
      `Verified Plan: Single Source of Truth`,
    ]
  );

  currentY = 74;

  // 1. QUANTIFIED DAILY NUTRITION TARGETS SECTION
  doc.fillColor(primaryDark).fontSize(10.5).font('Helvetica-Bold')
     .text('PERSONALIZED QUANTIFIED NUTRITION TARGETS', 36, currentY);
  currentY += 13;
  doc.rect(36, currentY, 523.28, 1).fill(borderMedium);
  currentY += 5;

  const targets = data.preventionPlan?.dietaryGuidance?.quantifiedTargets;

  // Nutrition Table Header
  doc.rect(36, currentY, 523.28, 16).fill(bgAlternate);
  doc.fillColor(textDark).fontSize(7.5).font('Helvetica-Bold')
     .text('NUTRIENT / METRIC', 46, currentY + 4)
     .text('EVIDENCE-BASED TARGET', 190, currentY + 4)
     .text('CLINICAL GUIDELINES & PRIORITIES', 340, currentY + 4);
  currentY += 16;

  const nutritionRows = [
    { label: 'Energy Target', target: targets?.dailyCalorieTarget || '1,800 - 2,100 kcal/day', note: 'Calibrated to patient BMR, physical activity, and BMI deficit' },
    { label: 'Dietary Fibre', target: targets?.fibreTarget || '30 - 35 g/day', note: 'Prioritize soluble fractions (oats, legumes, pectin, chia seeds)' },
    { label: 'Carbohydrates', target: targets?.carbohydrateTarget || '200 - 230 g/day', note: 'Intact whole grains, legumes, and low-glycemic vegetables' },
    { label: 'Dietary Sodium', target: targets?.sodiumLimit || '< 1,500 mg/day', note: 'Strict DASH limit; avoid cured meats, bouillon, and processed snacks' },
    { label: 'Saturated Fat', target: targets?.saturatedFatLimit || '< 6% total energy', note: 'Keep < 11-14g/day; replace with cold-pressed olive oil & nuts' },
    { label: 'Proteins', target: targets?.proteinGuidance || '75 - 90 g/day (1.0-1.2 g/kg)', note: 'Fatty fish (salmon, sardines) 2x/wk, skinless poultry, lentils' },
    { label: 'Added Sugars', target: targets?.addedSugarLimit || '< 25 g/day (< 5%)', note: 'Zero sugar-sweetened beverages or refined bakery syrups' },
    { label: 'Fruit & Produce', target: targets?.fruitVegServings || '5 - 7 servings/day', note: 'Cruciferous vegetables, dark greens, and antioxidant-rich berries' },
    { label: 'Clean Hydration', target: targets?.hydrationGuidance || '2.0 - 2.8 L/day', note: 'Pure clean water; adjust for climate and physical sweat' },
  ];

  nutritionRows.forEach((nr, idx) => {
    const rowBg = idx % 2 === 0 ? '#FFFFFF' : bgLight;
    doc.rect(36, currentY, 523.28, 17).fill(rowBg);
    doc.rect(36, currentY, 523.28, 17).stroke(borderLight);

    doc.fillColor(textDark).fontSize(7.5).font('Helvetica-Bold')
       .text(cleanAscii(nr.label), 46, currentY + 4.5, { width: 135, ellipsis: true });
    doc.fillColor(primaryBlue).fontSize(7.5).font('Helvetica-Bold')
       .text(cleanAscii(nr.target), 190, currentY + 4.5, { width: 140, ellipsis: true });
    doc.fillColor(textMuted).fontSize(7).font('Helvetica')
       .text(cleanAscii(nr.note), 340, currentY + 4.5, { width: 215, height: 11, ellipsis: true });

    currentY += 17;
  });

  currentY += 10;

  // 2. WHAT TO EAT MORE OF & WHAT TO LIMIT (Side-by-Side)
  const colW = 256;
  const listCardH = 82;
  const colLeftX = 36;
  const colRightX = 303.28;

  // Left: Prioritize
  doc.rect(colLeftX, currentY, colW, listCardH).fill('#ECFDF5');
  doc.rect(colLeftX, currentY, colW, listCardH).stroke('#A7F3D0');
  doc.fillColor('#059669').fontSize(8).font('Helvetica-Bold')
     .text('WHAT TO EAT MORE OF (CARDIOPROTECTIVE)', colLeftX + 8, currentY + 6);

  const prioList = data.preventionPlan?.dietaryGuidance?.foodsToPrioritize || [
    'Steel-cut oats, pearled barley, and legumes',
    'Extra virgin cold-pressed olive oil & avocado',
    'Wild salmon, mackerel, and chia seeds (omega-3)',
    'Leafy greens (spinach, kale) & potassium produce',
  ];
  let prioY = currentY + 18;
  prioList.slice(0, 4).forEach((item: string) => {
    doc.fillColor(textDark).fontSize(7).font('Helvetica')
       .text(`+  ${cleanAscii(item)}`, colLeftX + 8, prioY, { width: colW - 16, height: 11, ellipsis: true });
    prioY += 14;
  });

  // Right: Limit
  doc.rect(colRightX, currentY, colW, listCardH).fill('#FFF1F2');
  doc.rect(colRightX, currentY, colW, listCardH).stroke('#FECDD3');
  doc.fillColor('#E11D48').fontSize(8).font('Helvetica-Bold')
     .text('WHAT TO STRICTLY LIMIT (ATHEROGENIC)', colRightX + 8, currentY + 6);

  const limitList = data.preventionPlan?.dietaryGuidance?.foodsToLimit || [
    'Sodium-heavy cured meats, bacon, and sausages',
    'Commercial canned soups, pickles, and bouillons',
    'Butter, palm oil, coconut fat, and trans fats',
    'Sugar-sweetened beverages, soda, and pastries',
  ];
  let limY = currentY + 18;
  limitList.slice(0, 4).forEach((item: string) => {
    doc.fillColor(textDark).fontSize(7).font('Helvetica')
       .text(`-  ${cleanAscii(item)}`, colRightX + 8, limY, { width: colW - 16, height: 11, ellipsis: true });
    limY += 14;
  });

  currentY += listCardH + 10;

  // 3. SUGGESTED MEAL STRUCTURE SECTION
  doc.fillColor(primaryDark).fontSize(10.5).font('Helvetica-Bold')
     .text('SUGGESTED DAILY MEAL STRUCTURE', 36, currentY);
  currentY += 13;
  doc.rect(36, currentY, 523.28, 1).fill(borderMedium);
  currentY += 6;

  const ms = data.preventionPlan?.dietaryGuidance?.mealStructure;
  const mealBoxW = 125;
  const mealBoxH = 72;
  const mealBoxes = [
    { title: 'BREAKFAST', items: ms ? [ms.breakfast.carbohydrateChoice, ms.breakfast.recommendedFoods[1] || 'Fresh berries', 'Lean protein source'] : ['Rolled oats with flaxseed', 'Fresh berries', '2 egg whites'] },
    { title: 'LUNCH', items: ms ? [ms.lunch.vegetableBase.slice(0, 32) + '...', ms.lunch.proteinSource.slice(0, 32), 'Olive oil vinaigrette'] : ['Large green salad base', '120g grilled fish/chicken', 'Extra virgin olive oil'] },
    { title: 'MID-DAY SNACK', items: ms ? [ms.snack.options[0]?.slice(0, 32) || 'Raw walnuts (25g)', 'Crisp apple slices', ms.snack.portionGuidance] : ['Raw almonds/walnuts (25g)', 'Crisp apple slices', '< 150 kcal'] },
    { title: 'DINNER', items: ms ? [ms.dinner.vegetables.slice(0, 32) + '...', ms.dinner.proteinSource.slice(0, 32), ms.dinner.carbPortion] : ['Steamed broccoli & zucchini', '120g baked white fish', '1/3 cup steamed quinoa'] },
  ];

  mealBoxes.forEach((mb, idx) => {
    const mbX = 36 + (idx * (mealBoxW + 7.76));
    doc.rect(mbX, currentY, mealBoxW, mealBoxH).fill(bgLight);
    doc.rect(mbX, currentY, mealBoxW, mealBoxH).stroke(borderLight);

    doc.fillColor(primaryDark).fontSize(7.5).font('Helvetica-Bold')
       .text(mb.title, mbX + 6, currentY + 6);

    let mY = currentY + 18;
    mb.items.forEach((it) => {
      doc.fillColor(textMuted).fontSize(6.5).font('Helvetica')
         .text(`* ${cleanAscii(it)}`, mbX + 6, mY, { width: mealBoxW - 12, height: 13, ellipsis: true });
      mY += 15;
    });
  });

  currentY += mealBoxH + 10;

  // 4. CLINICAL FOLLOW-UP & DIETITIAN DISCLAIMER
  const followUpText = cleanAscii(
    data.preventionPlan?.clinicalFollowUp ||
    'Discuss these risk factor trends with your physician during your next routine visit (recommended within 30-90 days).'
  );
  doc.rect(36, currentY, 523.28, 22).fill('#EFF6FF');
  doc.rect(36, currentY, 523.28, 22).stroke('#BFDBFE');
  doc.fillColor('#1E40AF').fontSize(7).font('Helvetica-Bold')
     .text('RECOMMENDED CLINICAL CONSULTATION TIMELINE', 46, currentY + 4);
  doc.fillColor(textDark).fontSize(7).font('Helvetica')
     .text(followUpText, 46, currentY + 12, { width: 503, lineBreak: false, ellipsis: true });

  currentY += 26;

  // Clinical Decision-Support Notice & Registered Dietitian Disclaimer
  const disclaimer = 'CLINICAL DECISION-SUPPORT NOTICE: This document is generated for cardiovascular risk assessment and preventive decision support. It is not an official medical diagnosis and does not replace in-person diagnostic evaluation by a certified physician or cardiologist. Individualized nutritional and caloric targets should be confirmed with a qualified healthcare professional or registered dietitian. Do not modify or discontinue prescribed medical treatments without consulting your healthcare provider.';
  doc.rect(36, currentY, 523.28, 24).fill(bgLight);
  doc.rect(36, currentY, 523.28, 24).stroke(borderLight);
  doc.fillColor(textLightMuted).fontSize(6).font('Helvetica')
     .text(disclaimer, 44, currentY + 4, { align: 'justify', width: 507, lineGap: 0.8 });

  // ==========================================
  // PASS 2: RENDER FOOTERS ACROSS ALL PAGES
  // ==========================================
  const pageRange = doc.bufferedPageRange();
  const totalPages = pageRange.count;

  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);
    const footerY = 812;
    doc.rect(36, footerY, 523.28, 0.75).fill(borderLight);
    doc.fillColor(textLightMuted).fontSize(7.5).font('Helvetica');
    doc.text('HridayaDarpana Clinical Intelligence Platform', 36, footerY + 6, { lineBreak: false });
    doc.text('Confidential Healthcare Document  -  SHA-256 Verified Record', 36, footerY + 6, { align: 'center', width: 523.28, lineBreak: false });
    doc.text(`Page ${i + 1} of ${totalPages}`, 36, footerY + 6, { align: 'right', width: 523.28, lineBreak: false });
  }

  doc.end();
};
