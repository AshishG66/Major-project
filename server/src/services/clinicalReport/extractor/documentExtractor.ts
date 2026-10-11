import { GoogleGenerativeAI } from '@google/generative-ai';
import { createRequire } from 'module';
import { logger } from '../../../config/logger.js';
import { DocumentedOutcome } from '../types.js';

const require = createRequire(import.meta.url);
const pdfParsePkg = require('pdf-parse');
const PDFParse = pdfParsePkg.PDFParse || pdfParsePkg;

export interface RawExtractedEntities {
  caseId?: string;
  reportDate?: string;
  age?: { value: number; confidence: number; snippet: string };
  gender?: { value: 'MALE' | 'FEMALE' | 'OTHER'; confidence: number; snippet: string };

  // Laboratory values
  fastingBloodSugar?: { value: number; confidence: number; snippet: string; unit: string; referenceRange?: string };
  cholesterol?: { value: number; confidence: number; snippet: string; unit: string; referenceRange?: string };
  hdl?: { value: number; confidence: number; snippet: string; unit: string; referenceRange?: string };
  ldl?: { value: number; confidence: number; snippet: string; unit: string; referenceRange?: string };
  triglycerides?: { value: number; confidence: number; snippet: string; unit: string; referenceRange?: string };
  vldl?: { value: number; confidence: number; snippet: string; unit: string; referenceRange?: string };
  nonHdlCholesterol?: { value: number; confidence: number; snippet: string; unit: string; referenceRange?: string };

  // Advanced Cardiac Biomarkers (Not fed into baseline models)
  hscrp?: { value: number; confidence: number; snippet: string; unit: string; referenceRange?: string };
  troponinI?: { value: number; confidence: number; snippet: string; unit: string; referenceRange?: string };
  apolipoproteinB?: { value: number; confidence: number; snippet: string; unit: string; referenceRange?: string };
  lpa?: { value: number; confidence: number; snippet: string; unit: string; referenceRange?: string };
  hba1c?: { value: number; confidence: number; snippet: string; unit: string; referenceRange?: string };

  // Vitals & History (if present)
  systolicBP?: { value: number; confidence: number; snippet: string };
  diastolicBP?: { value: number; confidence: number; snippet: string };
  height?: { value: number; confidence: number; snippet: string };
  weight?: { value: number; confidence: number; snippet: string };
  bmi?: { value: number; confidence: number; snippet: string };
  restingHeartRate?: { value: number; confidence: number; snippet: string };
  ecgResults?: { value: 'NORMAL' | 'ST_T_ABNORMAL' | 'LV_HYPERTROPHY'; confidence: number; snippet: string };
  exerciseFrequency?: { value: number; confidence: number; snippet: string };
  smoking?: { value: boolean; confidence: number; snippet: string };
  alcohol?: { value: boolean; confidence: number; snippet: string };
  diabetes?: { value: boolean; confidence: number; snippet: string };
  familyHistory?: { value: boolean; confidence: number; snippet: string };
  chestPainType?: { value: 'TYPICAL' | 'ATYPICAL' | 'NON_ANGINAL' | 'ASYMPTOMATIC'; confidence: number; snippet: string };
  sleepDuration?: { value: number; confidence: number; snippet: string };
  stressLevel?: { value: number; confidence: number; snippet: string };

  documentedOutcome: DocumentedOutcome;
  rawText: string;
}

/**
 * Decodes font characters mapped to Unicode Private Use Area (0xF020 to 0xF07E)
 * common in proprietary diagnostic lab PDF outputs (e.g. Dr Lal PathLabs, SRL, Apollo).
 */
export function decodePdfPrivateUseArea(text: string): string {
  if (!text) return '';
  let res = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0xf020 && code <= 0xf07e) {
      res += String.fromCharCode(code - 0xf000);
    } else {
      res += text[i];
    }
  }
  return res;
}

/**
 * Extracts raw plain text from PDF buffer using PDFParse and PUA normalization.
 */
export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  try {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const raw = typeof result === 'string' ? result : (result?.text || '');
    return decodePdfPrivateUseArea(raw);
  } catch (err: any) {
    logger.warn(`[PDFParse] Buffer parsing failed: ${err.message}. Trying direct string decode.`);
    return decodePdfPrivateUseArea(buffer.toString('utf-8'));
  }
}

const getGenAI = (): GoogleGenerativeAI | null => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  return apiKey ? new GoogleGenerativeAI(apiKey) : null;
};

/**
 * Deterministic medical text entity parser.
 * Identifies hospital & diagnostic laboratory values with high precision.
 */
export function parseMedicalTextDeterministic(text: string): RawExtractedEntities {
  const lower = text.toLowerCase();

  // 1. Case ID & Report Date
  let caseId = 'CASE-' + Math.floor(100000 + Math.random() * 900000);
  const caseMatch = text.match(/(?:Lab\s*No\.?|Case\s*ID|Sample\s*ID|Patient\s*ID|PID)\s*[:\t]?\s*([A-Za-z0-9_-]{5,20})/i)
    || text.match(/\*([A-Za-z0-9_-]{6,15})\*/i);
  if (caseMatch) {
    caseId = caseMatch[1].trim();
  }

  let reportDate: string | undefined;
  const dateMatch = text.match(/(?:Reported|Collected|Date)\s*[:\t]?\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i)
    || text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
  if (dateMatch) {
    reportDate = dateMatch[1];
  }

  // 2. Age
  let age: RawExtractedEntities['age'];
  const ageMatch = text.match(/(\d{1,3})\s*(?:Years?|Yrs?|Y\/O)\b/i)
    || text.match(/(?:Age|Patient\s*Age)\s*[:\t]?\s*(\d{1,3})\b/i)
    || text.match(/(\d{1,3})\s*(?:years?\s*old|y\.o\.|yo\b)/i);
  if (ageMatch) {
    const a = parseInt(ageMatch[1], 10);
    if (a >= 1 && a <= 120) {
      age = { value: a, confidence: 98, snippet: ageMatch[0].trim() };
    }
  }

  // 3. Gender
  let gender: RawExtractedEntities['gender'];
  const genderMatch = text.match(/(?:Gender|Sex)\s*[:\t]?\s*(Male|Female|Other|M|F)\b/i)
    || text.match(/\b(Male|Female)\b/i);
  if (genderMatch) {
    const g = genderMatch[1].toLowerCase();
    if (g === 'm' || g === 'male') {
      gender = { value: 'MALE', confidence: 98, snippet: genderMatch[0].trim() };
    } else if (g === 'f' || g === 'female') {
      gender = { value: 'FEMALE', confidence: 98, snippet: genderMatch[0].trim() };
    } else {
      gender = { value: 'OTHER', confidence: 90, snippet: genderMatch[0].trim() };
    }
  }

  // 4. Apolipoprotein B (Apo B) - Advanced Marker
  let apolipoproteinB: RawExtractedEntities['apolipoproteinB'];
  const apoMatch = text.match(/APOLIPOPROTEIN\s*B\s*(?:\(Apo\s*B\))?[^]*?mg\/dL\s*(?:[\d\s-]*\t)?(\d+(?:\.\d+)?)/i)
    || text.match(/(?:Apo\s*B|Apolipoprotein\s*B)[^0-9\n]*(\d+(?:\.\d+)?)\s*mg\/dL/i)
    || text.match(/46\s*-\s*174\t(\d+(?:\.\d+)?)/i);
  if (apoMatch) {
    const val = parseFloat(apoMatch[1]);
    if (val > 10 && val < 400) {
      apolipoproteinB = {
        value: val,
        confidence: 96,
        snippet: `Apolipoprotein B: ${val} mg/dL`,
        unit: 'mg/dL',
        referenceRange: '46 - 174 mg/dL',
      };
    }
  }

  // 5. hs-CRP (High-Sensitivity C-Reactive Protein) - Advanced Marker
  let hscrp: RawExtractedEntities['hscrp'];
  const hscrpMatch = text.match(/CARDIO\s*C-REACTIVE\s*PROTEIN[^]*?mg\/L\s*(?:[<>\d.\s]*\t)?(\d+(?:\.\d+)?)/i)
    || text.match(/(?:hsCRP|hs-CRP|Cardio\s*CRP)[^0-9\n]*(\d+(?:\.\d+)?)\s*mg\/L/i)
    || text.match(/<1\.00\t(\d+(?:\.\d+)?)/i);
  if (hscrpMatch) {
    const val = parseFloat(hscrpMatch[1]);
    if (val >= 0 && val < 100) {
      hscrp = {
        value: val,
        confidence: 97,
        snippet: `hs-CRP: ${val} mg/L`,
        unit: 'mg/L',
        referenceRange: '< 1.00 mg/L (Low Risk)',
      };
    }
  }

  // 6. Troponin-I (High-Sensitivity) - Advanced Marker
  let troponinI: RawExtractedEntities['troponinI'];
  const tropMatch = text.match(/TROPONIN-\s*I[^]*?ng\/L\s*[:\t]?\s*(\d+(?:\.\d+)?)/i)
    || text.match(/(?:hsTnI|Troponin\s*I)[^0-9\n]*(\d+(?:\.\d+)?)\s*(?:ng\/L|pg\/mL)/i);
  if (tropMatch) {
    const val = parseFloat(tropMatch[1]);
    if (val >= 0 && val < 5000) {
      troponinI = {
        value: val,
        confidence: 96,
        snippet: `Troponin-I: ${val} ng/L`,
        unit: 'ng/L',
        referenceRange: '< 6 ng/L (Low Risk in Males)',
      };
    }
  }

  // 7. Fasting Blood Sugar / Glucose
  let fastingBloodSugar: RawExtractedEntities['fastingBloodSugar'];
  const fbsMatch = text.match(/GLUCOSE,\s*FASTING[^]*?mg\/dL\s*(?:[\d\s-]*\t)?(\d{2,3})/i)
    || text.match(/(?:fasting\s*glucose|fasting\s*blood\s*sugar|fbs|f\.b\.s\.)\s*[:\t]?\s*(\d{2,3})/i)
    || text.match(/70\s*-\s*100\t(\d{2,3})/i);
  if (fbsMatch) {
    const val = parseInt(fbsMatch[1], 10);
    if (val >= 40 && val <= 500) {
      fastingBloodSugar = {
        value: val,
        confidence: 95,
        snippet: `Fasting Blood Sugar: ${val} mg/dL`,
        unit: 'mg/dL',
        referenceRange: '70 - 100 mg/dL',
      };
    }
  }

  // 8. Total Cholesterol
  let cholesterol: RawExtractedEntities['cholesterol'];
  const cholMatch = text.match(/Cholesterol\s*Total[^]*?(?:<|>)?\s*(\d{2,3})\s*(?:mg\/dL)?/i)
    || text.match(/(?:total\s*cholesterol|serum\s*cholesterol|t\.?chol)\s*[:\t]?\s*(\d{2,3})/i);
  if (cholMatch) {
    const val = parseInt(cholMatch[1], 10);
    if (val >= 70 && val <= 500) {
      // In interim reports like Z615 where only interval <200 is shown:
      const isRefOnly = text.includes('<200 \tmg/dL') && !text.match(/Cholesterol\s*Total[^]*?\t(\d{2,3})\s*$/m);
      cholesterol = {
        value: val,
        confidence: isRefOnly ? 75 : 95,
        snippet: `Total Cholesterol: ${val} mg/dL`,
        unit: 'mg/dL',
        referenceRange: '< 200 mg/dL',
      };
    }
  }

  // 9. Triglycerides
  let triglycerides: RawExtractedEntities['triglycerides'];
  const tgMatch = text.match(/Triglycerides[^]*?(?:<|>)?\s*(\d{2,3})\s*(?:mg\/dL)?/i);
  if (tgMatch) {
    const val = parseInt(tgMatch[1], 10);
    if (val >= 30 && val <= 1000) {
      triglycerides = {
        value: val,
        confidence: 90,
        snippet: `Triglycerides: ${val} mg/dL`,
        unit: 'mg/dL',
        referenceRange: '< 150 mg/dL',
      };
    }
  }

  // 10. HDL Cholesterol
  let hdl: RawExtractedEntities['hdl'];
  const hdlMatch = text.match(/HDL\s*Cholesterol[^]*?(?:<|>)?\s*(\d{2,3})\s*(?:mg\/dL)?/i);
  if (hdlMatch) {
    const val = parseInt(hdlMatch[1], 10);
    if (val >= 15 && val <= 150) {
      hdl = {
        value: val,
        confidence: 90,
        snippet: `HDL Cholesterol: ${val} mg/dL`,
        unit: 'mg/dL',
        referenceRange: '> 40 mg/dL',
      };
    }
  }

  // 11. LDL Cholesterol
  let ldl: RawExtractedEntities['ldl'];
  const ldlMatch = text.match(/LDL\s*Cholesterol[^]*?(?:<|>)?\s*(\d{2,3}(?:\.\d+)?)\s*(?:mg\/dL)?/i);
  if (ldlMatch) {
    const val = parseFloat(ldlMatch[1]);
    if (val >= 20 && val <= 400) {
      ldl = {
        value: Math.round(val),
        confidence: 90,
        snippet: `LDL Cholesterol: ${val} mg/dL`,
        unit: 'mg/dL',
        referenceRange: '< 100 mg/dL',
      };
    }
  }

  // 12. VLDL Cholesterol
  let vldl: RawExtractedEntities['vldl'];
  const vldlMatch = text.match(/VLDL\s*Cholesterol[^]*?(?:<|>)?\s*(\d{1,3})\s*(?:mg\/dL)?/i);
  if (vldlMatch) {
    const val = parseInt(vldlMatch[1], 10);
    if (val >= 5 && val <= 150) {
      vldl = {
        value: val,
        confidence: 88,
        snippet: `VLDL Cholesterol: ${val} mg/dL`,
        unit: 'mg/dL',
        referenceRange: '< 30 mg/dL',
      };
    }
  }

  // 13. Non-HDL Cholesterol
  let nonHdlCholesterol: RawExtractedEntities['nonHdlCholesterol'];
  const nonHdlMatch = text.match(/Non-HDL\s*Cholesterol[^]*?(?:<|>)?\s*(\d{2,3})\s*(?:mg\/dL)?/i);
  if (nonHdlMatch) {
    const val = parseInt(nonHdlMatch[1], 10);
    if (val >= 30 && val <= 400) {
      nonHdlCholesterol = {
        value: val,
        confidence: 88,
        snippet: `Non-HDL Cholesterol: ${val} mg/dL`,
        unit: 'mg/dL',
        referenceRange: '< 130 mg/dL',
      };
    }
  }

  // 14. Lipoprotein(a) / Lp(a)
  let lpa: RawExtractedEntities['lpa'];
  const lpaMatch = text.match(/LIPOPROTEIN\(a\)[^]*?(?:<|>)?\s*(\d{1,3})\s*(?:mg\/dL)?/i);
  if (lpaMatch) {
    const val = parseInt(lpaMatch[1], 10);
    if (val >= 1 && val <= 300) {
      lpa = {
        value: val,
        confidence: 92,
        snippet: `Lipoprotein(a): ${val} mg/dL`,
        unit: 'mg/dL',
        referenceRange: '< 20 mg/dL',
      };
    }
  }

  // 15. HbA1c
  let hba1c: RawExtractedEntities['hba1c'];
  const hba1cMatch = text.match(/HbA1c\s*%\s*(?:[\d.\s-]*\t)?(\d+(?:\.\d+)?)/i)
    || text.match(/(?:HbA1c|Glycosylated\s*Hemoglobin)\s*[:\t]?\s*(\d+(?:\.\d+)?)\s*%/i);
  if (hba1cMatch) {
    const val = parseFloat(hba1cMatch[1]);
    if (val >= 3.0 && val <= 18.0) {
      hba1c = {
        value: val,
        confidence: 94,
        snippet: `HbA1c: ${val}%`,
        unit: '%',
        referenceRange: '4.00 - 5.60%',
      };
    }
  }

  // 16. Blood Pressure (if report includes vitals e.g. discharge summaries)
  let systolicBP: RawExtractedEntities['systolicBP'];
  let diastolicBP: RawExtractedEntities['diastolicBP'];
  const bpMatch = text.match(/(?:bp|blood\s*pressure|b\.p\.)\s*[:=-]?\s*(\d{2,3})\s*[\/|\\]\s*(\d{2,3})/i)
    || text.match(/(\d{2,3})\s*[\/|\\]\s*(\d{2,3})\s*mm\s*hg/i);
  if (bpMatch) {
    const s = parseInt(bpMatch[1], 10);
    const d = parseInt(bpMatch[2], 10);
    if (s >= 60 && s <= 260 && d >= 30 && d <= 160) {
      systolicBP = { value: s, confidence: 96, snippet: bpMatch[0].trim() };
      diastolicBP = { value: d, confidence: 96, snippet: bpMatch[0].trim() };
    }
  }

  // 17. Resting Heart Rate
  let restingHeartRate: RawExtractedEntities['restingHeartRate'];
  const hrMatch = text.match(/(?:heart\s*rate|resting\s*hr|pulse|pulse\s*rate)\s*[:=-]?\s*(\d{2,3})\s*(?:bpm)?/i);
  if (hrMatch) {
    const hr = parseInt(hrMatch[1], 10);
    if (hr >= 35 && hr <= 220) {
      restingHeartRate = { value: hr, confidence: 95, snippet: hrMatch[0].trim() };
    }
  }

  // 18. Height, Weight, BMI
  let height: RawExtractedEntities['height'];
  const htMatch = text.match(/(?:height|ht)\s*[:=-]?\s*(\d{2,3}(?:\.\d+)?)\s*(?:cm)?/i);
  if (htMatch) {
    const h = parseFloat(htMatch[1]);
    if (h >= 50 && h <= 250) {
      height = { value: Math.round(h), confidence: 95, snippet: htMatch[0].trim() };
    }
  }

  let weight: RawExtractedEntities['weight'];
  const wtMatch = text.match(/(?:weight|wt)\s*[:=-]?\s*(\d{2,3}(?:\.\d+)?)\s*(?:kg)?/i);
  if (wtMatch) {
    const w = parseFloat(wtMatch[1]);
    if (w >= 20 && w <= 300) {
      weight = { value: Math.round(w), confidence: 95, snippet: wtMatch[0].trim() };
    }
  }

  let bmi: RawExtractedEntities['bmi'];
  const bmiMatch = text.match(/(?:bmi|body\s*mass\s*index)\s*[:=-]?\s*(\d{1,2}(?:\.\d+)?)/i);
  if (bmiMatch) {
    const b = parseFloat(bmiMatch[1]);
    if (b >= 10 && b <= 70) {
      bmi = { value: b, confidence: 95, snippet: bmiMatch[0].trim() };
    }
  } else if (height && weight) {
    const calcBmi = parseFloat((weight.value / ((height.value / 100) ** 2)).toFixed(1));
    bmi = { value: calcBmi, confidence: 99, snippet: `Derived from ${height.value}cm and ${weight.value}kg` };
  }

  // 19. ECG Results
  let ecgResults: RawExtractedEntities['ecgResults'];
  if (lower.includes('left ventricular hypertrophy') || lower.includes('lvh')) {
    ecgResults = { value: 'LV_HYPERTROPHY', confidence: 96, snippet: 'Left Ventricular Hypertrophy' };
  } else if (lower.includes('st-t wave abnormality') || lower.includes('st elevation') || lower.includes('st depression') || lower.includes('t-wave inversion') || lower.includes('st-t abnormal')) {
    ecgResults = { value: 'ST_T_ABNORMAL', confidence: 94, snippet: 'ST-T Wave Changes detected' };
  } else if (lower.includes('normal sinus rhythm') || lower.includes('ecg: normal') || lower.includes('normal ecg')) {
    ecgResults = { value: 'NORMAL', confidence: 95, snippet: 'Normal sinus rhythm' };
  }

  // 20. Lifestyle factors
  let smoking: RawExtractedEntities['smoking'];
  if (lower.includes('current smoker') || lower.includes('smoker: yes') || lower.includes('active smoker') || lower.includes('smoking: yes')) {
    smoking = { value: true, confidence: 92, snippet: 'Active smoker documented' };
  } else if (lower.includes('non-smoker') || lower.includes('smoker: no') || lower.includes('never smoked') || lower.includes('smoking: no')) {
    smoking = { value: false, confidence: 95, snippet: 'Documented non-smoker' };
  }

  let alcohol: RawExtractedEntities['alcohol'];
  if (lower.includes('alcohol: yes') || lower.includes('active alcohol') || lower.includes('social drinker') || lower.includes('alcohol intake: regular')) {
    alcohol = { value: true, confidence: 90, snippet: 'Alcohol intake documented' };
  } else if (lower.includes('alcohol: no') || lower.includes('alcohol: none') || lower.includes('denies alcohol')) {
    alcohol = { value: false, confidence: 92, snippet: 'Denies alcohol intake' };
  }

  let diabetes: RawExtractedEntities['diabetes'];
  if (lower.includes('type 2 diabetes') || lower.includes('t2dm') || lower.includes('known diabetic') || lower.includes('diabetic: yes') || lower.includes('diabetes mellitus')) {
    diabetes = { value: true, confidence: 98, snippet: 'History of Diabetes Mellitus' };
  } else if (lower.includes('non-diabetic') || lower.includes('diabetic: no') || lower.includes('denies diabetes')) {
    diabetes = { value: false, confidence: 95, snippet: 'Non-diabetic' };
  }

  let familyHistory: RawExtractedEntities['familyHistory'];
  if (lower.includes('family history of cad') || lower.includes('family history: positive') || lower.includes('family history of heart disease') || lower.includes('family history: yes')) {
    familyHistory = { value: true, confidence: 92, snippet: 'Family history of heart disease' };
  } else if (lower.includes('family history: negative') || lower.includes('family history: no') || lower.includes('no family history of cad')) {
    familyHistory = { value: false, confidence: 92, snippet: 'No family history of heart disease' };
  }

  // 21. Documented Historical Outcomes (for retrospective validation)
  let documentedOutcome: DocumentedOutcome = {
    eventType: 'NO_EVENT',
    eventDetectedInReport: false,
  };

  const outcomePatterns: Array<{ type: DocumentedOutcome['eventType']; regex: RegExp; desc: string }> = [
    {
      type: 'MYOCARDIAL_INFARCTION',
      regex: /(?:myocardial\s*infarction|acute\s*coronary\s*syndrome|stemi|nstemi|heart\s*attack)/i,
      desc: 'Documented acute myocardial infarction / ACS',
    },
    {
      type: 'STROKE',
      regex: /(?:cerebrovascular\s*accident|ischemic\s*stroke|hemorrhagic\s*stroke|stroke\b|tia\b)/i,
      desc: 'Documented cerebrovascular accident / stroke',
    },
    {
      type: 'HEART_FAILURE',
      regex: /(?:congestive\s*heart\s*failure|decompensated\s*heart\s*failure|hfpef|hfref|cardiac\s*failure)/i,
      desc: 'Documented congestive heart failure',
    },
    {
      type: 'ARRHYTHMIA',
      regex: /(?:atrial\s*fibrillation|ventricular\s*tachycardia|ventricular\s*fibrillation|afib\b)/i,
      desc: 'Documented cardiac arrhythmia',
    },
  ];

  for (const item of outcomePatterns) {
    const m = text.match(item.regex);
    if (m) {
      documentedOutcome = {
        eventType: item.type,
        eventDescription: item.desc,
        outcomeSource: `Identified near snippet: "${m[0]}"`,
        eventDetectedInReport: true,
      };
      break;
    }
  }

  return {
    caseId,
    reportDate,
    age,
    gender,
    fastingBloodSugar,
    cholesterol,
    hdl,
    ldl,
    triglycerides,
    vldl,
    nonHdlCholesterol,
    hscrp,
    troponinI,
    apolipoproteinB,
    lpa,
    hba1c,
    systolicBP,
    diastolicBP,
    height,
    weight,
    bmi,
    restingHeartRate,
    ecgResults,
    smoking,
    alcohol,
    diabetes,
    familyHistory,
    documentedOutcome,
    rawText: text.substring(0, 1200),
  };
}

/**
 * High-level extractor orchestrator.
 * 1. Extracts text from PDF buffer (with PUA mapping) or uses string directly.
 * 2. Runs deterministic medical regex engine.
 * 3. If Gemini is available, uses multimodal inference for verification/enhancement,
 *    falling back seamlessly to deterministic results on any API error.
 */
export async function extractClinicalEntities(
  fileBuffer: Buffer | null,
  mimeType: string,
  fileName: string,
  rawTextOverride?: string
): Promise<RawExtractedEntities> {
  logger.info(`[ClinicalExtractor] Processing report ${fileName} (MIME: ${mimeType})`);

  let text = rawTextOverride || '';
  if (fileBuffer && !text) {
    if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
      text = await extractTextFromPdfBuffer(fileBuffer);
    } else {
      text = decodePdfPrivateUseArea(fileBuffer.toString('utf-8'));
    }
  }

  // Baseline deterministic extraction
  const baseline = parseMedicalTextDeterministic(text);

  // Optional Gemini vision/multimodal enhancement if API key configured and buffer provided
  const genAI = getGenAI();
  if (genAI && fileBuffer) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `You are a specialized clinical document extraction system for HridayaDarpana.
Extract the following exact fields from this medical report if present.
Return valid JSON only. DO NOT invent or fabricate any value.
Fields to extract:
- age: number
- gender: "MALE" | "FEMALE" | "OTHER"
- totalCholesterol: number in mg/dL
- fastingGlucose: number in mg/dL
- hdl: number in mg/dL
- ldl: number in mg/dL
- triglycerides: number in mg/dL
- hscrp: number in mg/L
- troponinI: number in ng/L
- apolipoproteinB: number in mg/dL
- systolicBP: number in mmHg
- diastolicBP: number in mmHg
- heartRate: number in bpm

Format:
{
  "age": { "value": number or null, "extracted": boolean, "snippet": string },
  ...
}`;

      const b64 = fileBuffer.toString('base64');
      const genPromise = model.generateContent([
        prompt,
        {
          inlineData: {
            data: b64,
            mimeType: mimeType || 'application/pdf',
          },
        },
      ]);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini multimodal call timed out after 5000ms')), 5000)
      );

      const res: any = await Promise.race([genPromise, timeoutPromise]);
      const rawResp = res.response.text().replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(rawResp);
      logger.info(`[ClinicalExtractor] Gemini vision extraction succeeded for ${fileName}`);

      // Merge Gemini insights if higher fidelity
      if (parsed.age?.extracted && parsed.age.value && !baseline.age) {
        baseline.age = { value: parsed.age.value, confidence: 95, snippet: parsed.age.snippet || 'Gemini Vision' };
      }
      if (parsed.gender?.extracted && parsed.gender.value && !baseline.gender) {
        baseline.gender = { value: parsed.gender.value.toUpperCase(), confidence: 95, snippet: parsed.gender.snippet || 'Gemini Vision' };
      }
      if (parsed.fastingGlucose?.extracted && parsed.fastingGlucose.value && !baseline.fastingBloodSugar) {
        baseline.fastingBloodSugar = { value: parsed.fastingGlucose.value, confidence: 92, snippet: parsed.fastingGlucose.snippet || 'Gemini Vision', unit: 'mg/dL' };
      }
      if (parsed.totalCholesterol?.extracted && parsed.totalCholesterol.value && !baseline.cholesterol) {
        baseline.cholesterol = { value: parsed.totalCholesterol.value, confidence: 92, snippet: parsed.totalCholesterol.snippet || 'Gemini Vision', unit: 'mg/dL' };
      }
      if (parsed.systolicBP?.extracted && parsed.systolicBP.value && !baseline.systolicBP) {
        baseline.systolicBP = { value: parsed.systolicBP.value, confidence: 94, snippet: parsed.systolicBP.snippet || 'Gemini Vision' };
      }
      if (parsed.diastolicBP?.extracted && parsed.diastolicBP.value && !baseline.diastolicBP) {
        baseline.diastolicBP = { value: parsed.diastolicBP.value, confidence: 94, snippet: parsed.diastolicBP.snippet || 'Gemini Vision' };
      }
      if (parsed.hscrp?.extracted && parsed.hscrp.value && !baseline.hscrp) {
        baseline.hscrp = { value: parsed.hscrp.value, confidence: 95, snippet: parsed.hscrp.snippet || 'Gemini Vision', unit: 'mg/L' };
      }
      if (parsed.troponinI?.extracted && parsed.troponinI.value && !baseline.troponinI) {
        baseline.troponinI = { value: parsed.troponinI.value, confidence: 95, snippet: parsed.troponinI.snippet || 'Gemini Vision', unit: 'ng/L' };
      }
      if (parsed.apolipoproteinB?.extracted && parsed.apolipoproteinB.value && !baseline.apolipoproteinB) {
        baseline.apolipoproteinB = { value: parsed.apolipoproteinB.value, confidence: 95, snippet: parsed.apolipoproteinB.snippet || 'Gemini Vision', unit: 'mg/dL' };
      }
    } catch (err: any) {
      logger.warn(`[ClinicalExtractor] Gemini vision deferred (${err.message}). Deterministic baseline retained.`);
    }
  }

  return baseline;
}
