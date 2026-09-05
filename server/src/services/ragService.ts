import { logger } from '../config/logger.js';

interface Guideline {
  keywords: string[];
  content: string;
}

const MEDICAL_KNOWLEDGE_BASE: Guideline[] = [
  {
    keywords: ['bp', 'blood pressure', 'hypertension', 'systolic', 'diastolic', 'pressure'],
    content: "AHA/ACC Hypertension Guidelines: Normal Blood Pressure is < 120/80 mmHg. Elevated BP is 120-129/<80. Stage 1 Hypertension is 130-139 systolic or 80-89 diastolic. Stage 2 Hypertension is >= 140/90. Hypertensive Crisis is > 180/120, requiring immediate clinical care."
  },
  {
    keywords: ['cholesterol', 'lipid', 'ldl', 'hdl', 'triglycerides'],
    content: "Cardiac Lipid Guidelines: Desirable total cholesterol is < 200 mg/dL. Borderline high is 200-239 mg/dL. High risk is >= 240. Optimal LDL is < 100 mg/dL, while HDL should be > 40 mg/dL for men and > 50 mg/dL for women to protect against coronary artery plaque."
  },
  {
    keywords: ['sugar', 'glucose', 'diabetes', 'fasting blood sugar'],
    content: "Fasting Blood Glucose Standards: Normal fasting blood glucose is < 100 mg/dL. Prediabetes is defined as 100-125 mg/dL. Diabetes mellitus is diagnosed at >= 126 mg/dL on two separate scans."
  },
  {
    keywords: ['diet', 'eat', 'recipe', 'food', 'nutrition', 'sodium', 'salt', 'potassium', 'dash'],
    content: "Cardiovascular Diet Guidelines: The DASH (Dietary Approaches to Stop Hypertension) and Mediterranean diets are clinically proven to decrease cardiovascular strain. Restrict sodium to < 2,300 mg/day (ideal target: < 1,500 mg/day). Emphasize potassium, dietary fiber, and omega-3 fatty acids."
  },
  {
    keywords: ['exercise', 'walk', 'run', 'gym', 'workout', 'cardio', 'steps', 'active'],
    content: "AHA Cardiovascular Activity Guidelines: Adults should engage in at least 150 minutes of moderate-intensity aerobic physical activity (such as brisk walking) or 75 minutes of vigorous activity per week. Incorporate muscle-strengthening work at least 2 days a week."
  },
  {
    keywords: ['ecg', 'electrocardiogram', 'rhythm', 'st-t', 'lv_hypertropy', 'lvh', 'heart rhythm'],
    content: "ECG Classification Parameters: Normal resting sinus rhythm is 60-100 bpm. ST-T wave abnormalities on resting ECG indicate potential ischemia or myocardial strain. Left Ventricular Hypertrophy (LVH) signs indicate chronic hypertensive cardiac muscle wall thickening."
  }
];

export const retrieveMedicalReferences = (query: string): string => {
  const normalizedQuery = query.toLowerCase();
  const matchedGuidelines: string[] = [];

  logger.info(`[RAG Engine] Searching clinical knowledge base for query: "${query.slice(0, 40)}..."`);

  for (const guide of MEDICAL_KNOWLEDGE_BASE) {
    const hasMatch = guide.keywords.some(keyword => normalizedQuery.includes(keyword));
    if (hasMatch) {
      matchedGuidelines.push(guide.content);
    }
  }

  // If no specific match is found, append a general cardiovascular reference guide
  if (matchedGuidelines.length === 0) {
    matchedGuidelines.push("General Cardiac Prevention: Risk factors like age, BMI, family history, and smoking status are cumulative. Regular screening and maintaining active lifestyle habits are core to preventative care.");
  }

  return matchedGuidelines.join('\n\n');
};
