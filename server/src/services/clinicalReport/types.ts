export type ValueSource = 'REPORT' | 'DERIVED' | 'USER_ENTERED' | 'MISSING';

export interface ExtractedFieldMetadata<T> {
  value: T | null;
  source: ValueSource;
  confidence: number; // 0 - 100
  extracted: boolean;
  unit?: string;
  referenceRange?: string;
  sourceSnippet?: string;
  isCompatibleWithModels: boolean;
  note?: string;
}

/**
 * Canonical normalized clinical report data object.
 * Represents all extractable patient demographics, vitals,
 * lipid fractions, and advanced cardiac biomarkers.
 */
export interface ClinicalReportData {
  // Demographics
  age?: number | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;

  // Anthropometrics & Vitals
  height?: number | null;
  weight?: number | null;
  bmi?: number | null;
  systolicBP?: number | null;
  diastolicBP?: number | null;
  restingHeartRate?: number | null;

  // Primary Laboratory Markers
  cholesterol?: number | null; // Total Serum Cholesterol in mg/dL
  fastingBloodSugar?: number | null; // Fasting Plasma Glucose in mg/dL

  // Diagnostics & Lifestyle
  ecgResults?: 'NORMAL' | 'ST_T_ABNORMAL' | 'LV_HYPERTROPHY' | null;
  exerciseFrequency?: number | null; // Days per week (0-7)
  chestPainSymptomType?: 'TYPICAL' | 'ATYPICAL' | 'NON_ANGINAL' | 'ASYMPTOMATIC' | null;
  sleepDuration?: number | null; // Hours per night
  stressLevel?: number | null; // Scale 1-10

  // Risk Factors & Medical History
  activeSmoking?: boolean | null;
  activeAlcohol?: boolean | null;
  diabetes?: boolean | null;
  familyHeartDiseaseHistory?: boolean | null;

  // Additional Extracted Clinical Values (Advanced Biomarkers)
  // These are NOT fed blindly into standard baseline ML models
  hscrp?: number | null; // Cardio C-Reactive Protein (hs-CRP) in mg/L
  troponinI?: number | null; // High-Sensitivity Troponin-I in ng/L
  apolipoproteinB?: number | null; // Apo B in mg/dL
  ldl?: number | null; // LDL Cholesterol in mg/dL
  hdl?: number | null; // HDL Cholesterol in mg/dL
  triglycerides?: number | null; // Triglycerides in mg/dL
  vldl?: number | null; // VLDL Cholesterol in mg/dL
  nonHdlCholesterol?: number | null; // Non-HDL Cholesterol in mg/dL
  lpa?: number | null; // Lipoprotein(a) in mg/dL
  hba1c?: number | null; // HbA1c in %
}

/**
 * Metadata representation of an extracted clinical biomarker not currently
 * accepted by the baseline ML models. Displayed explicitly for academic and clinical rigor.
 */
export interface UnusedClinicalValue {
  key: string;
  displayName: string;
  value: number | string | null;
  unit?: string;
  referenceRange?: string;
  category: 'ADVANCED_CARDIAC_BIOMARKER' | 'LIPID_SUBFRACTION' | 'GLYCEMIC_MARKER' | 'INFLAMMATORY_MARKER';
  clinicalSignificance: string;
  statusNotice: 'Extracted — not currently used by prediction model';
  sourceSnippet?: string;
}

export type ModelId = 'framingham' | 'cardio_lifestyle' | 'heart_failure' | 'stroke' | 'ecg_arrhythmia';

export interface ModelReadinessInfo {
  modelId: ModelId;
  modelName: string;
  status: 'READY' | 'INCOMPLETE';
  requiredFields: string[];
  availableFields: string[];
  missingFields: string[];
  reason?: string;
}

export interface DocumentedOutcome {
  eventType: 'MYOCARDIAL_INFARCTION' | 'STROKE' | 'HEART_FAILURE' | 'ARRHYTHMIA' | 'CORONARY_INTERVENTION' | 'CARDIAC_SURGERY' | 'NO_EVENT' | 'OTHER';
  outcomeDate?: string;
  outcomeSource?: string;
  eventDescription?: string;
  eventDetectedInReport: boolean;
}

export interface ClinicalReportAnalysisResult {
  caseId: string;
  reportFileName: string;
  reportDate?: string;
  extractionStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  patientDemographics: {
    age: ExtractedFieldMetadata<number>;
    gender: ExtractedFieldMetadata<'MALE' | 'FEMALE' | 'OTHER'>;
  };
  laboratoryValues: {
    fastingBloodSugar: ExtractedFieldMetadata<number>;
    cholesterol: ExtractedFieldMetadata<number>;
    hdl: ExtractedFieldMetadata<number>;
    ldl: ExtractedFieldMetadata<number>;
    triglycerides: ExtractedFieldMetadata<number>;
    vldl: ExtractedFieldMetadata<number>;
    nonHdlCholesterol: ExtractedFieldMetadata<number>;
    hscrp: ExtractedFieldMetadata<number>;
    troponinI: ExtractedFieldMetadata<number>;
    apolipoproteinB: ExtractedFieldMetadata<number>;
    lpa: ExtractedFieldMetadata<number>;
    hba1c: ExtractedFieldMetadata<number>;
  };
  vitalsAndLifestyle: {
    systolicBP: ExtractedFieldMetadata<number>;
    diastolicBP: ExtractedFieldMetadata<number>;
    height: ExtractedFieldMetadata<number>;
    weight: ExtractedFieldMetadata<number>;
    bmi: ExtractedFieldMetadata<number>;
    restingHeartRate: ExtractedFieldMetadata<number>;
    ecgResults: ExtractedFieldMetadata<'NORMAL' | 'ST_T_ABNORMAL' | 'LV_HYPERTROPHY'>;
    exerciseFrequency: ExtractedFieldMetadata<number>;
    smoking: ExtractedFieldMetadata<boolean>;
    alcohol: ExtractedFieldMetadata<boolean>;
    diabetes: ExtractedFieldMetadata<boolean>;
    familyHistory: ExtractedFieldMetadata<boolean>;
    chestPainType: ExtractedFieldMetadata<'TYPICAL' | 'ATYPICAL' | 'NON_ANGINAL' | 'ASYMPTOMATIC'>;
    sleepDuration: ExtractedFieldMetadata<number>;
    stressLevel: ExtractedFieldMetadata<number>;
  };
  modelCompatibility: {
    compatibleFields: string[];
    derivableFields: string[];
    unusedFields: string[];
    missingFields: string[];
  };
  modelReadiness: Record<ModelId, ModelReadinessInfo>;
  unusedClinicalValues: UnusedClinicalValue[];
  documentedOutcome: DocumentedOutcome;
  rawTextSummary: string;
}

export interface SingleModelPredictionOutput {
  modelId: ModelId;
  modelName: string;
  status: 'EXECUTED' | 'UNAVAILABLE';
  riskScore?: number;
  riskLevel?: string;
  probability?: number;
  confidence?: number;
  outputDetails?: Record<string, any>;
  reasonIfUnavailable?: string;
}

export interface ClinicalReportPredictionResult {
  id?: string;
  caseId: string;
  reportSource: string;
  reportDate?: string;
  overallRiskScore?: number;
  overallRiskLevel?: string;
  modelResults: Record<ModelId, SingleModelPredictionOutput>;
  shapExplanation: Array<{
    feature: string;
    value: string | number;
    importance: number;
    impact: string;
    direction?: string;
  }>;
  sourceDataAttribution: Record<string, {
    value: any;
    source: ValueSource;
    displaySource: string;
  }>;
  unusedClinicalValues: UnusedClinicalValue[];
  digitalTwinMetrics?: {
    heartRate: number;
    systolicBP: number;
    diastolicBP: number;
    pumpingEfficiency?: number;
    vascularAge?: number;
    ecgStatus?: string;
  };
  preventionPlan?: any;
  recommendations?: any;
  createdAt: string;
}
