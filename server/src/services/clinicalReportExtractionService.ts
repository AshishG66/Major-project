import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../config/logger.js';

export interface ExtractedField<T> {
  value: T | null;
  confidence: number; // 0 - 100
  sourceSnippet?: string;
  extracted: boolean;
}

export interface DocumentedOutcome {
  eventType: 'MYOCARDIAL_INFARCTION' | 'STROKE' | 'HEART_FAILURE' | 'ARRHYTHMIA' | 'CORONARY_INTERVENTION' | 'CARDIAC_SURGERY' | 'NO_EVENT' | 'OTHER';
  outcomeDate?: string;
  outcomeSource?: string;
  eventDescription?: string;
  eventDetectedInReport: boolean;
}

export interface ExtractedClinicalReportData {
  age: ExtractedField<number>;
  gender: ExtractedField<'MALE' | 'FEMALE' | 'OTHER'>;
  height: ExtractedField<number>;
  weight: ExtractedField<number>;
  bmi: ExtractedField<number>;
  systolicBP: ExtractedField<number>;
  diastolicBP: ExtractedField<number>;
  cholesterol: ExtractedField<number>;
  heartRate: ExtractedField<number>;
  bloodSugar: ExtractedField<number>;
  ecgResult: ExtractedField<'NORMAL' | 'ST_T_ABNORMAL' | 'LV_HYPERTROPHY'>;
  exerciseFrequency: ExtractedField<number>;
  smoking: ExtractedField<boolean>;
  alcohol: ExtractedField<boolean>;
  diabetes: ExtractedField<boolean>;
  familyHistory: ExtractedField<boolean>;
  chestPainType: ExtractedField<'TYPICAL' | 'ATYPICAL' | 'NON_ANGINAL' | 'ASYMPTOMATIC'>;
  sleepDuration: ExtractedField<number>;
  stressLevel: ExtractedField<number>;
  documentedOutcome: DocumentedOutcome;
  rawTextSummary: string;
  missingFields: string[];
}

const getGenAI = (): GoogleGenerativeAI | null => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  return apiKey ? new GoogleGenerativeAI(apiKey) : null;
};

/**
 * Regex-based clinical information extraction engine.
 * Serves as a deterministic baseline and fallback when LLM is offline or
 * for fast extraction from structured medical discharge/lab reports.
 */
export function extractClinicalEntitiesFromText(text: string): ExtractedClinicalReportData {
  const lower = text.toLowerCase();

  // Helper to test regex
  const findRegex = (regex: RegExp): RegExpMatchArray | null => text.match(regex);

  // 1. Blood Pressure: e.g., 158/94, 158 / 94 mmHg, BP: 140/90
  let systolicBP: ExtractedField<number> = { value: null, confidence: 0, extracted: false };
  let diastolicBP: ExtractedField<number> = { value: null, confidence: 0, extracted: false };
  const bpMatch = findRegex(/(?:bp|blood\s*pressure|b\.p\.)\s*[:=-]?\s*(\d{2,3})\s*[\/|\\]\s*(\d{2,3})/i)
    || findRegex(/(\d{2,3})\s*[\/|\\]\s*(\d{2,3})\s*mm\s*hg/i);
  if (bpMatch) {
    const s = parseInt(bpMatch[1], 10);
    const d = parseInt(bpMatch[2], 10);
    if (s >= 60 && s <= 260 && d >= 30 && d <= 160) {
      systolicBP = { value: s, confidence: 96, sourceSnippet: bpMatch[0], extracted: true };
      diastolicBP = { value: d, confidence: 96, sourceSnippet: bpMatch[0], extracted: true };
    }
  }

  // 2. Age
  let age: ExtractedField<number> = { value: null, confidence: 0, extracted: false };
  const ageMatch = findRegex(/(?:age|patient\s*age|y\/o|yr\s*old)\s*[:=-]?\s*(\d{1,3})/i)
    || findRegex(/(\d{1,3})\s*(?:years?\s*old|y\.o\.|yo\b)/i);
  if (ageMatch) {
    const a = parseInt(ageMatch[1], 10);
    if (a >= 1 && a <= 120) {
      age = { value: a, confidence: 98, sourceSnippet: ageMatch[0], extracted: true };
    }
  }

  // 3. Gender
  let gender: ExtractedField<'MALE' | 'FEMALE' | 'OTHER'> = { value: null, confidence: 0, extracted: false };
  const sexMatch = findRegex(/(?:gender|sex)\s*[:=-]?\s*(male|female|m|f|other)/i)
    || findRegex(/\b(male|female)\b/i);
  if (sexMatch) {
    const val = sexMatch[1].toLowerCase();
    if (val === 'm' || val === 'male') {
      gender = { value: 'MALE', confidence: 97, sourceSnippet: sexMatch[0], extracted: true };
    } else if (val === 'f' || val === 'female') {
      gender = { value: 'FEMALE', confidence: 97, sourceSnippet: sexMatch[0], extracted: true };
    }
  }

  // 4. Height (cm)
  let height: ExtractedField<number> = { value: null, confidence: 0, extracted: false };
  const heightMatch = findRegex(/(?:height|ht)\s*[:=-]?\s*(\d{2,3}(?:\.\d+)?)\s*(?:cm)?/i);
  if (heightMatch) {
    const h = parseFloat(heightMatch[1]);
    if (h >= 50 && h <= 250) {
      height = { value: Math.round(h), confidence: 95, sourceSnippet: heightMatch[0], extracted: true };
    }
  }

  // 5. Weight (kg)
  let weight: ExtractedField<number> = { value: null, confidence: 0, extracted: false };
  const weightMatch = findRegex(/(?:weight|wt)\s*[:=-]?\s*(\d{2,3}(?:\.\d+)?)\s*(?:kg)?/i);
  if (weightMatch) {
    const w = parseFloat(weightMatch[1]);
    if (w >= 20 && w <= 300) {
      weight = { value: Math.round(w), confidence: 95, sourceSnippet: weightMatch[0], extracted: true };
    }
  }

  // 6. Cholesterol (mg/dL)
  let cholesterol: ExtractedField<number> = { value: null, confidence: 0, extracted: false };
  const cholMatch = findRegex(/(?:total\s*cholesterol|cholesterol|t\.?chol|serum\s*cholesterol)\s*[:=-]?\s*(\d{2,3})/i);
  if (cholMatch) {
    const c = parseInt(cholMatch[1], 10);
    if (c >= 80 && c <= 500) {
      cholesterol = { value: c, confidence: 94, sourceSnippet: cholMatch[0], extracted: true };
    }
  }

  // 7. Heart Rate (bpm)
  let heartRate: ExtractedField<number> = { value: null, confidence: 0, extracted: false };
  const hrMatch = findRegex(/(?:heart\s*rate|resting\s*hr|pulse|pulse\s*rate)\s*[:=-]?\s*(\d{2,3})\s*(?:bpm)?/i);
  if (hrMatch) {
    const hr = parseInt(hrMatch[1], 10);
    if (hr >= 35 && hr <= 220) {
      heartRate = { value: hr, confidence: 95, sourceSnippet: hrMatch[0], extracted: true };
    }
  }

  // 8. Blood Sugar / Fasting Glucose (mg/dL)
  let bloodSugar: ExtractedField<number> = { value: null, confidence: 0, extracted: false };
  const bsMatch = findRegex(/(?:fasting\s*(?:blood\s*)?(?:sugar|glucose)|fbs|blood\s*sugar|glucose)\s*[:=-]?\s*(\d{2,3})/i);
  if (bsMatch) {
    const bs = parseInt(bsMatch[1], 10);
    if (bs >= 40 && bs <= 500) {
      bloodSugar = { value: bs, confidence: 94, sourceSnippet: bsMatch[0], extracted: true };
    }
  }

  // 9. Smoking
  let smoking: ExtractedField<boolean> = { value: null, confidence: 0, extracted: false };
  if (lower.includes('current smoker') || lower.includes('smoker: yes') || lower.includes('tobacco: positive') || lower.includes('active smoker') || lower.includes('smoking: yes')) {
    smoking = { value: true, confidence: 92, sourceSnippet: 'Documented active smoking habit', extracted: true };
  } else if (lower.includes('non-smoker') || lower.includes('smoker: no') || lower.includes('tobacco: negative') || lower.includes('never smoked') || lower.includes('smoking: no')) {
    smoking = { value: false, confidence: 95, sourceSnippet: 'Documented non-smoker', extracted: true };
  }

  // 10. Alcohol
  let alcohol: ExtractedField<boolean> = { value: null, confidence: 0, extracted: false };
  if (lower.includes('alcohol: yes') || lower.includes('alcohol intake: regular') || lower.includes('active alcohol') || lower.includes('social drinker') || lower.includes('alcohol: positive')) {
    alcohol = { value: true, confidence: 90, sourceSnippet: 'Alcohol intake documented', extracted: true };
  } else if (lower.includes('alcohol: no') || lower.includes('alcohol: none') || lower.includes('denies alcohol') || lower.includes('alcohol: negative')) {
    alcohol = { value: false, confidence: 92, sourceSnippet: 'Denies alcohol intake', extracted: true };
  }

  // 11. Diabetes
  let diabetes: ExtractedField<boolean> = { value: null, confidence: 0, extracted: false };
  if (lower.includes('diabetes mellitus') || lower.includes('type 2 diabetes') || lower.includes('t2dm') || lower.includes('diabetic: yes') || lower.includes('known diabetic')) {
    diabetes = { value: true, confidence: 98, sourceSnippet: 'History of Diabetes Mellitus', extracted: true };
  } else if (lower.includes('diabetic: no') || lower.includes('non-diabetic') || lower.includes('denies diabetes')) {
    diabetes = { value: false, confidence: 95, sourceSnippet: 'Documented non-diabetic', extracted: true };
  }

  // 12. Family History
  let familyHistory: ExtractedField<boolean> = { value: null, confidence: 0, extracted: false };
  if (lower.includes('family history of cad') || lower.includes('family history: positive') || lower.includes('family history of heart disease') || lower.includes('family history: yes')) {
    familyHistory = { value: true, confidence: 92, sourceSnippet: 'Documented family history of cardiac disease', extracted: true };
  } else if (lower.includes('family history: negative') || lower.includes('family history: no') || lower.includes('no family history of cad')) {
    familyHistory = { value: false, confidence: 92, sourceSnippet: 'No family history of heart disease', extracted: true };
  }

  // 13. ECG Result
  let ecgResult: ExtractedField<'NORMAL' | 'ST_T_ABNORMAL' | 'LV_HYPERTROPHY'> = { value: null, confidence: 0, extracted: false };
  if (lower.includes('left ventricular hypertrophy') || lower.includes('lvh')) {
    ecgResult = { value: 'LV_HYPERTROPHY', confidence: 96, sourceSnippet: 'ECG shows Left Ventricular Hypertrophy', extracted: true };
  } else if (lower.includes('st-t wave abnormality') || lower.includes('st elevation') || lower.includes('st depression') || lower.includes('t-wave inversion') || lower.includes('st-t abnormal')) {
    ecgResult = { value: 'ST_T_ABNORMAL', confidence: 94, sourceSnippet: 'ECG: ST-T wave changes detected', extracted: true };
  } else if (lower.includes('normal sinus rhythm') || lower.includes('ecg: normal') || lower.includes('normal ecg')) {
    ecgResult = { value: 'NORMAL', confidence: 95, sourceSnippet: 'ECG: Normal sinus rhythm', extracted: true };
  }

  // 14. Chest Pain Type
  let chestPainType: ExtractedField<'TYPICAL' | 'ATYPICAL' | 'NON_ANGINAL' | 'ASYMPTOMATIC'> = { value: null, confidence: 0, extracted: false };
  if (lower.includes('typical angina') || lower.includes('retrosternal pressure radiating to left arm') || lower.includes('exertional angina')) {
    chestPainType = { value: 'TYPICAL', confidence: 94, sourceSnippet: 'Typical anginal symptoms noted', extracted: true };
  } else if (lower.includes('atypical chest pain') || lower.includes('atypical angina')) {
    chestPainType = { value: 'ATYPICAL', confidence: 91, sourceSnippet: 'Atypical chest discomfort reported', extracted: true };
  } else if (lower.includes('non-anginal') || lower.includes('musculoskeletal chest pain') || lower.includes('pleuritic chest pain')) {
    chestPainType = { value: 'NON_ANGINAL', confidence: 90, sourceSnippet: 'Non-anginal chest discomfort', extracted: true };
  } else if (lower.includes('asymptomatic') || lower.includes('denies chest pain') || lower.includes('no chest pain')) {
    chestPainType = { value: 'ASYMPTOMATIC', confidence: 95, sourceSnippet: 'Patient asymptomatic for chest pain', extracted: true };
  }

  // 15. Exercise Frequency (days/week)
  let exerciseFrequency: ExtractedField<number> = { value: null, confidence: 0, extracted: false };
  const exMatch = findRegex(/(?:exercise|physical\s*activity)\s*[:=-]?\s*(\d)\s*(?:days?\s*\/\s*week|times?\s*weekly)?/i);
  if (exMatch) {
    const e = parseInt(exMatch[1], 10);
    if (e >= 0 && e <= 7) {
      exerciseFrequency = { value: e, confidence: 88, sourceSnippet: exMatch[0], extracted: true };
    }
  }

  // 16. Sleep Duration (hours)
  let sleepDuration: ExtractedField<number> = { value: null, confidence: 0, extracted: false };
  const sleepMatch = findRegex(/(?:sleep|sleep\s*duration)\s*[:=-]?\s*(\d{1,2}(?:\.\d+)?)\s*(?:hours?|hrs?)?/i);
  if (sleepMatch) {
    const sl = parseFloat(sleepMatch[1]);
    if (sl >= 3 && sl <= 16) {
      sleepDuration = { value: sl, confidence: 85, sourceSnippet: sleepMatch[0], extracted: true };
    }
  }

  // 17. Stress Level (1-10)
  let stressLevel: ExtractedField<number> = { value: null, confidence: 0, extracted: false };
  const stressMatch = findRegex(/(?:stress|stress\s*level)\s*[:=-]?\s*(\d{1,2})\s*(?:\/\s*10)?/i);
  if (stressMatch) {
    const st = parseInt(stressMatch[1], 10);
    if (st >= 1 && st <= 10) {
      stressLevel = { value: st, confidence: 85, sourceSnippet: stressMatch[0], extracted: true };
    }
  }

  // 18. Calculated BMI
  let bmi: ExtractedField<number> = { value: null, confidence: 0, extracted: false };
  if (height.value && weight.value) {
    const calculated = parseFloat((weight.value / ((height.value / 100) ** 2)).toFixed(1));
    bmi = { value: calculated, confidence: 99, sourceSnippet: `Derived from ${height.value} cm & ${weight.value} kg`, extracted: true };
  }

  // 19. Documented Outcome Extraction (for Retrospective Validation)
  // Check if historical outcome is mentioned in discharge diagnosis or clinical course
  let documentedOutcome: DocumentedOutcome = {
    eventType: 'NO_EVENT',
    eventDetectedInReport: false,
  };

  const outcomePatterns: Array<{ type: DocumentedOutcome['eventType']; regex: RegExp; desc: string }> = [
    {
      type: 'MYOCARDIAL_INFARCTION',
      regex: /(?:myocardial\s*infarction|acute\s*coronary\s*syndrome|stemi|nstemi|heart\s*attack)/i,
      desc: 'Documented acute myocardial infarction / ACS in historical record'
    },
    {
      type: 'STROKE',
      regex: /(?:cerebrovascular\s*accident|ischemic\s*stroke|hemorrhagic\s*stroke|stroke\b|transient\s*ischemic\s*attack|tia\b)/i,
      desc: 'Documented cerebrovascular event / stroke in historical record'
    },
    {
      type: 'HEART_FAILURE',
      regex: /(?:congestive\s*heart\s*failure|decompensated\s*heart\s*failure|hfpef|hfref|cardiac\s*failure)/i,
      desc: 'Documented congestive heart failure event in historical record'
    },
    {
      type: 'ARRHYTHMIA',
      regex: /(?:atrial\s*fibrillation|ventricular\s*tachycardia|ventricular\s*fibrillation|supraventricular\s*tachycardia|afib\b)/i,
      desc: 'Documented significant cardiac arrhythmia in historical record'
    },
    {
      type: 'CORONARY_INTERVENTION',
      regex: /(?:percutaneous\s*coronary\s*intervention|pci\b|coronary\s*stent|angioplasty)/i,
      desc: 'Documented percutaneous coronary intervention / stent in historical record'
    },
    {
      type: 'CARDIAC_SURGERY',
      regex: /(?:coronary\s*artery\s*bypass|cabg\b|valve\s*replacement|cardiac\s*surgery)/i,
      desc: 'Documented coronary bypass or cardiac surgery in historical record'
    }
  ];

  for (const item of outcomePatterns) {
    const match = text.match(item.regex);
    if (match) {
      documentedOutcome = {
        eventType: item.type,
        eventDescription: item.desc,
        outcomeSource: `Identified near text: "${match[0]}"`,
        eventDetectedInReport: true,
      };
      break;
    }
  }

  // Compute Missing Fields
  const missingFields: string[] = [];
  if (!age.extracted) missingFields.push('Age');
  if (!gender.extracted) missingFields.push('Gender');
  if (!height.extracted) missingFields.push('Height');
  if (!weight.extracted) missingFields.push('Weight');
  if (!systolicBP.extracted) missingFields.push('Systolic Blood Pressure');
  if (!diastolicBP.extracted) missingFields.push('Diastolic Blood Pressure');
  if (!cholesterol.extracted) missingFields.push('Total Cholesterol');
  if (!heartRate.extracted) missingFields.push('Resting Heart Rate');
  if (!bloodSugar.extracted) missingFields.push('Fasting Blood Sugar');
  if (!ecgResult.extracted) missingFields.push('ECG Findings');
  if (!exerciseFrequency.extracted) missingFields.push('Exercise Frequency');
  if (!smoking.extracted) missingFields.push('Smoking Status');
  if (!alcohol.extracted) missingFields.push('Alcohol Consumption');
  if (!diabetes.extracted) missingFields.push('Diabetes Status');
  if (!familyHistory.extracted) missingFields.push('Family Cardiac History');
  if (!chestPainType.extracted) missingFields.push('Chest Pain Symptoms');
  if (!sleepDuration.extracted) missingFields.push('Sleep Duration');
  if (!stressLevel.extracted) missingFields.push('Stress Level');

  const rawSummary = text.length > 500 ? text.substring(0, 500) + '...' : text;

  return {
    age,
    gender,
    height,
    weight,
    bmi,
    systolicBP,
    diastolicBP,
    cholesterol,
    heartRate,
    bloodSugar,
    ecgResult,
    exerciseFrequency,
    smoking,
    alcohol,
    diabetes,
    familyHistory,
    chestPainType,
    sleepDuration,
    stressLevel,
    documentedOutcome,
    rawTextSummary: rawSummary,
    missingFields,
  };
}

/**
 * Extracts clinical variables from document using Gemini Multimodal when available,
 * with seamless fallback to regex extraction.
 */
export async function extractClinicalReport(
  fileBuffer: Buffer | null,
  mimeType: string,
  fileName: string,
  rawTextOverride?: string
): Promise<ExtractedClinicalReportData> {
  logger.info(`[ReportExtraction] Processing ${fileName} (MIME: ${mimeType})`);

  let extractedText = rawTextOverride || '';

  // If text was directly supplied (or extracted from text/plain)
  if (extractedText && !fileBuffer) {
    return extractClinicalEntitiesFromText(extractedText);
  }

  const genAI = getGenAI();
  if (genAI && fileBuffer) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `You are a specialized clinical data extraction system for HridayaDarpana.
Your task is ONLY to extract structured clinical values and identify documented historical outcomes from the provided medical report.
DO NOT diagnose the patient. DO NOT invent values not present in the document.

Extract the following values if present in the document:
- age: number
- gender: "MALE" or "FEMALE"
- height: number in cm
- weight: number in kg
- systolicBP: number in mmHg
- diastolicBP: number in mmHg
- cholesterol: total cholesterol in mg/dL
- heartRate: resting heart rate in bpm
- bloodSugar: fasting glucose/sugar in mg/dL
- ecgResult: "NORMAL", "ST_T_ABNORMAL", or "LV_HYPERTROPHY"
- exerciseFrequency: days per week (0-7)
- smoking: boolean (true if smoker)
- alcohol: boolean (true if drinks alcohol)
- diabetes: boolean (true if diagnosed diabetic)
- familyHistory: boolean (true if family cardiac history)
- chestPainType: "TYPICAL", "ATYPICAL", "NON_ANGINAL", or "ASYMPTOMATIC"
- sleepDuration: hours per day (0-24)
- stressLevel: scale 1-10
- documentedOutcome: {
    eventType: "MYOCARDIAL_INFARCTION" | "STROKE" | "HEART_FAILURE" | "ARRHYTHMIA" | "CORONARY_INTERVENTION" | "CARDIAC_SURGERY" | "NO_EVENT" | "OTHER",
    outcomeDate: string or null,
    outcomeSource: string or null,
    eventDescription: string or null,
    eventDetectedInReport: boolean
  }

Return strict JSON format with keys matching the fields above. Each field (except documentedOutcome) should have:
{ "value": ..., "confidence": number (0-100), "sourceSnippet": "exact quoted snippet from report", "extracted": boolean }
If a field is not mentioned in the report, set value to null and extracted to false.`;

      const base64Data = fileBuffer.toString('base64');
      const response = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType || 'application/pdf',
          },
        },
      ]);

      const textResponse = response.response.text();
      // Clean possible Markdown fence
      const cleanJson = textResponse.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(cleanJson);

      logger.info(`[ReportExtraction] Successfully parsed structured data using Gemini vision/OCR`);
      
      // Calculate missing fields
      const missing: string[] = [];
      const keys = ['age', 'gender', 'height', 'weight', 'systolicBP', 'diastolicBP', 'cholesterol', 'heartRate', 'bloodSugar', 'ecgResult', 'exerciseFrequency', 'smoking', 'alcohol', 'diabetes', 'familyHistory', 'chestPainType', 'sleepDuration', 'stressLevel'];
      for (const k of keys) {
        if (!parsed[k] || !parsed[k].extracted || parsed[k].value === null) {
          missing.push(k);
        }
      }

      // Calculate BMI if height and weight present
      let bmiVal: ExtractedField<number> = { value: null, confidence: 0, extracted: false };
      if (parsed.height?.value && parsed.weight?.value) {
        const b = parseFloat((parsed.weight.value / ((parsed.height.value / 100) ** 2)).toFixed(1));
        bmiVal = { value: b, confidence: 99, sourceSnippet: `Derived from ${parsed.height.value} cm & ${parsed.weight.value} kg`, extracted: true };
      }

      return {
        age: parsed.age || { value: null, confidence: 0, extracted: false },
        gender: parsed.gender || { value: null, confidence: 0, extracted: false },
        height: parsed.height || { value: null, confidence: 0, extracted: false },
        weight: parsed.weight || { value: null, confidence: 0, extracted: false },
        bmi: bmiVal,
        systolicBP: parsed.systolicBP || { value: null, confidence: 0, extracted: false },
        diastolicBP: parsed.diastolicBP || { value: null, confidence: 0, extracted: false },
        cholesterol: parsed.cholesterol || { value: null, confidence: 0, extracted: false },
        heartRate: parsed.heartRate || { value: null, confidence: 0, extracted: false },
        bloodSugar: parsed.bloodSugar || { value: null, confidence: 0, extracted: false },
        ecgResult: parsed.ecgResult || { value: null, confidence: 0, extracted: false },
        exerciseFrequency: parsed.exerciseFrequency || { value: null, confidence: 0, extracted: false },
        smoking: parsed.smoking || { value: null, confidence: 0, extracted: false },
        alcohol: parsed.alcohol || { value: null, confidence: 0, extracted: false },
        diabetes: parsed.diabetes || { value: null, confidence: 0, extracted: false },
        familyHistory: parsed.familyHistory || { value: null, confidence: 0, extracted: false },
        chestPainType: parsed.chestPainType || { value: null, confidence: 0, extracted: false },
        sleepDuration: parsed.sleepDuration || { value: null, confidence: 0, extracted: false },
        stressLevel: parsed.stressLevel || { value: null, confidence: 0, extracted: false },
        documentedOutcome: parsed.documentedOutcome || { eventType: 'NO_EVENT', eventDetectedInReport: false },
        rawTextSummary: textResponse.slice(0, 400),
        missingFields: missing,
      };
    } catch (err: any) {
      logger.warn(`[ReportExtraction] Gemini vision extraction failed (${err.message}). Falling back to text entity parser.`);
    }
  }

  // Fallback to text parsing (or convert buffer string)
  const decodedText = fileBuffer ? fileBuffer.toString('utf-8') : extractedText;
  return extractClinicalEntitiesFromText(decodedText);
}
